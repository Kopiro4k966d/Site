# Меняет цвет всего экрана через Windows Magnification API (без драйверов).
# Читает команды из stdin: "m <25 чисел через запятую>" или "reset". Эффект живёт, пока процесс запущен.
$src = @"
using System;
using System.Runtime.InteropServices;
public static class Mag {
  [StructLayout(LayoutKind.Sequential)]
  public struct MAGCOLOREFFECT { [MarshalAs(UnmanagedType.ByValArray, SizeConst = 25)] public float[] transform; }
  [DllImport("Magnification.dll")] public static extern bool MagInitialize();
  [DllImport("Magnification.dll")] public static extern bool MagUninitialize();
  [DllImport("Magnification.dll")] public static extern bool MagSetFullscreenColorEffect(ref MAGCOLOREFFECT e);
  public static bool Set(float[] m) { var e = new MAGCOLOREFFECT(); e.transform = m; return MagSetFullscreenColorEffect(ref e); }
}
"@
Add-Type -TypeDefinition $src
[void][Mag]::MagInitialize()
$id = [float[]](1,0,0,0,0, 0,1,0,0,0, 0,0,1,0,0, 0,0,0,1,0, 0,0,0,0,1)
while (($line = [Console]::In.ReadLine()) -ne $null) {
  if ($line -eq 'reset') { [void][Mag]::Set($id) }
  elseif ($line -eq 'quit') { break }
  elseif ($line.StartsWith('m ')) {
    $p = $line.Substring(2).Split(',') | ForEach-Object { [float]::Parse($_, [Globalization.CultureInfo]::InvariantCulture) }
    if ($p.Count -eq 25) { [void][Mag]::Set([float[]]$p) }
  }
}
[void][Mag]::Set($id)
[void][Mag]::MagUninitialize()
