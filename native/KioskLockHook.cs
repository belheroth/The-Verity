// KioskLockHook — a native low-level keyboard hook that reliably blocks the
// Windows key and other escape paths (Task View, Alt+Tab, etc.) while a lock
// file exists. Electron's globalShortcut cannot swallow the bare Win key on
// Windows; only a WH_KEYBOARD_LL hook can.
//
// Usage: KioskLockHook.exe <lockfile>
//   - While <lockfile> EXISTS  -> hook is ACTIVE (blocks keys)
//   - While <lockfile> ABSENT  -> hook is PASSIVE (passes keys through)
//
// The lockfile lets the Electron main process toggle lockdown with zero native
// IPC: just create/remove the file.

using System;
using System.IO;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

class KioskLockHook
{
    // --- Win32 API ---
    delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", SetLastError = true)]
    static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll")]
    static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    static extern IntPtr GetModuleHandle(string lpModuleName);

    [DllImport("kernel32.dll")] static extern bool AttachConsole(int dwProcessId);
    [DllImport("kernel32.dll")] static extern bool FreeConsole();

    // WH_KEYBOARD_LL and message codes
    const int WH_KEYBOARD_LL = 13;
    const int WM_KEYDOWN = 0x0100;
    const int WM_KEYUP = 0x0101;
    const int WM_SYSKEYDOWN = 0x0104;
    const int WM_SYSKEYUP = 0x0105;

    // Virtual-key codes we want to block (0x prefix = hex)
    const uint VK_LWIN = 0x5B;
    const uint VK_RWIN = 0x5C;
    const uint VK_TAB = 0x09;
    const uint VK_ESCAPE = 0x1B;
    const uint VK_MENU = 0x12;   // Alt
    const uint VK_CONTROL = 0x11;
    const uint VK_F1 = 0x70;
    const uint VK_F4 = 0x73;
    const uint VK_DELETE = 0x2E;
    const uint VK_V = 0x56;

    [StructLayout(LayoutKind.Sequential)]
    struct KBDLLHOOKSTRUCT
    {
        public int vkCode;
        public int scanCode;
        public int flags;
        public int time;
        public IntPtr dwExtraInfo;
    }

    static LowLevelKeyboardProc proc = HookCallback;
    static IntPtr hookID = IntPtr.Zero;
    static volatile bool active = false;

    static string lockFile;
    static DateTime lastCheck = DateTime.MinValue;

    static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0 && active)
        {
            KBDLLHOOKSTRUCT kbd = (KBDLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(KBDLLHOOKSTRUCT));
            int msg = wParam.ToInt32();
            // We block on the down event so the OS never sees the keypress.
            if (msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN || msg == WM_KEYUP || msg == WM_SYSKEYUP)
            {
                Console.WriteLine("[hook] msg=0x" + msg.ToString("X") + " vk=0x" + kbd.vkCode.ToString("X") + " flags=0x" + kbd.flags.ToString("X"));
                if (IsBlocked(kbd.vkCode, msg))
                {
                    Console.WriteLine("[hook] BLOCKED vk=0x" + kbd.vkCode.ToString("X"));
                    return new IntPtr(1); // swallow the event
                }
            }
        }
        return CallNextHookEx(hookID, nCode, wParam, lParam);
    }

    static bool IsBlocked(int vkCode, int msg)
    {
        // Block the bare Windows keys outright (Start menu + every Win combo).
        if (vkCode == (int)VK_LWIN || vkCode == (int)VK_RWIN)
            return true;

        // Block Win+V (Windows Clipboard History popup)
        if (vkCode == (int)VK_V && (IsDown(VK_LWIN) || IsDown(VK_RWIN)))
            return true;

        if ((vkCode == (int)VK_LWIN || vkCode == (int)VK_RWIN) && IsDown(VK_V))
            return true;

        // The Win key is swallowed above, so these combos can never fire — but
        // block them explicitly anyway as defense in depth:
        //   - Win+Tab / Alt+Tab  (window / task switchers)
        if (vkCode == (int)VK_TAB)
            return true;

        // Alt+F4  (force close the app)
        if (vkCode == (int)VK_F4 && IsDown(VK_MENU))
            return true;

        // Win+Ctrl+Shift+B (restarts the display driver)
        // Covered by Win key being blocked, but keep Ctrl+Alt+Del blocked:
        if (vkCode == (int)VK_DELETE && IsDown(VK_CONTROL) && IsDown(VK_MENU))
            return true;

        return false;
    }

    static bool IsDown(uint vk)
    {
        return (GetAsyncKeyState(vk) & 0x8000) != 0;
    }

    [DllImport("user32.dll")] static extern short GetAsyncKeyState(uint vKey);

    [STAThread]
    static int Main(string[] args)
    {
        lockFile = args.Length > 0 ? args[0] : Path.Combine(Path.GetTempPath(), "verity_lock");
        // ensure the directory exists
        string dir = Path.GetDirectoryName(lockFile);
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

        hookID = SetWindowsHookEx(WH_KEYBOARD_LL, proc,
            GetModuleHandle(Process.GetCurrentProcess().MainModule.ModuleName), 0);

        if (hookID == IntPtr.Zero)
        {
            Console.WriteLine("KioskLockHook: failed to install hook (error " + Marshal.GetLastWin32Error() + ")");
            return 1;
        }

        Console.WriteLine("KioskLockHook ready. lockfile=" + lockFile);
        if (AttachConsole(-1)) { /* attach to parent console */ }

        // Poll for the lock file; never block the hook thread.
        while (true)
        {
            if ((DateTime.UtcNow - lastCheck).TotalMilliseconds > 250)
            {
                lastCheck = DateTime.UtcNow;
                active = File.Exists(lockFile);
            }
            Thread.Sleep(25);
        }
        // Console.ReadLine(); // unreachable but keeps compiler happy
    }
}