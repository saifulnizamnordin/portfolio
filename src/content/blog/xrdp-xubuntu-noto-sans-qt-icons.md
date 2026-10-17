---
title: "xrdp, XFCE and a missing \"+\": fixing Qt button glyphs with the Xubuntu session, Noto Sans 9 and 96 DPI"
description: "Over xrdp, a Qt app's \"+\" buttons rendered as \"-\" while the same build was fine on a local login. The cause was xrdp starting plain XFCE with DejaVu Sans 10 and no DPI. The fix: give xrdp sessions the Xubuntu session and pin Noto Sans 9 at 96 DPI."
pubDate: 2026-10-17
tags: ["linux", "xrdp", "xfce", "xubuntu", "qt", "fonts"]
---

This one looked like a broken app and turned out to be a font.

I run an Ubuntu 22.04 box with `xubuntu-desktop` that people reach over RDP through **xrdp**. A Qt 6 desktop app on it had a settings page with small add buttons. On a local login they showed `+`. Over RDP, the very same buttons showed `-`, and a couple of other small icons looked clipped or missing.

Same binary (I compared the md5), same apt packages, same machine. Only the way you logged in was different.

## TL;DR

xrdp starts the desktop with `startxfce4`, so RDP users get **stock XFCE** settings (DejaVu `Sans 10`, no DPI set, no hinting) rather than the **Xubuntu** ones a local LightDM login gets (`Noto Sans 9`, 96 DPI, `hintslight`). Qt follows those settings, the bigger glyph doesn't fit in a zero-padding button, and `+` gets clipped to `-`.

The fix, for xrdp sessions only:

1. Set `DESKTOP_SESSION=xubuntu` and put `/etc/xdg/xdg-xubuntu` into `XDG_CONFIG_DIRS`.
2. Pin the font and DPI explicitly: `Noto Sans 9`, `96`.
3. Log **off** (not just disconnect) and RDP back in.

## Why a local login and an RDP login look different

On a local login, LightDM starts the `xubuntu` session from `/usr/share/xsessions/xubuntu.desktop`, which sets `DESKTOP_SESSION=xubuntu`. Then `/etc/X11/Xsession.d/60x11-common_xdg_path` sees that and adds `/etc/xdg/xdg-xubuntu` to `XDG_CONFIG_DIRS`. That directory is where Xubuntu keeps its defaults: the Greybird theme, the icon theme, Noto Sans 9, 96 DPI and slight hinting.

xrdp skips all of that. Its `startwm.sh` ends up running `startxfce4`, which sets `DESKTOP_SESSION=xfce`. The Xsession script never adds `xdg-xubuntu`, so xfconf falls back to the plain XFCE defaults in `/etc/xdg`:

| | Local login (LightDM) | xrdp login |
|---|---|---|
| `DESKTOP_SESSION` | `xubuntu` | `xfce` |
| `XDG_CONFIG_DIRS` | `/etc/xdg/xdg-xubuntu:/etc/xdg` | `/etc/xdg` |
| Font | `Noto Sans 9` | DejaVu `Sans 10` |
| DPI | `96` | not set |
| Hinting | `hintslight` | none |

You can check this from inside a running session:

```sh
echo "$DESKTOP_SESSION $XDG_CONFIG_DIRS"
xfconf-query -c xsettings -p /Gtk/FontName
xfconf-query -c xsettings -p /Xft/DPI
```

## Why Qt cares

Qt apps on XFCE pick up the desktop font through the **gtk3 platform theme**. So whatever xsettings says, Qt uses too.

The buttons in question were borderless with zero padding, sized just big enough for the `+` glyph in Noto Sans 9. DejaVu Sans 10 is a larger font with a taller glyph, and with no DPI set the scaling is off as well. The glyph no longer fits, the vertical stroke gets clipped, and what's left is the horizontal bar: `-`. Other tight icons and glyphs got cut the same way.

It isn't a Qt bug or a missing icon theme. The app was designed against the Xubuntu defaults and was getting something else.

## Things that don't fix it

- **Reinstalling the app or Qt libraries.** The binary was identical on both logins.
- **Changing the font in the user's Appearance settings.** It works for that one user, but you're writing `~/.config/xfce4/xfconf/.../xsettings.xml` per user, and every new user still starts on DejaVu.
- **Swapping to the plain `xfce4` packages.** That's the same stock XFCE defaults, which is the problem.

## The fix

Two system files, and both only affect xrdp sessions. Console and SSH logins aren't touched.

### 1. Make xrdp sessions use the Xubuntu session

xrdp's `startwm.sh` sources `/etc/profile` before `/etc/X11/Xsession`, and that's the hook xrdp itself suggests for choosing a desktop. So a file in `/etc/profile.d/` can set the environment before XFCE starts:

```sh
# /etc/profile.d/xrdp-xubuntu-session.sh
# Give xrdp sessions the Xubuntu defaults plus a font/DPI pin.
if [ -n "$XRDP_SESSION" ] && [ -f /usr/share/xsessions/xubuntu.desktop ]; then
    export DESKTOP_SESSION=xubuntu
    case ":${XDG_CONFIG_DIRS:-}:" in
        *:/etc/xdg/xrdp-local:*) ;;
        *) XDG_CONFIG_DIRS="/etc/xdg/xrdp-local:/etc/xdg/xdg-xubuntu:${XDG_CONFIG_DIRS:-/etc/xdg}" ;;
    esac
    export XDG_CONFIG_DIRS
fi
```

`XRDP_SESSION` is set by xrdp, so this does nothing on a normal login. `60x11-common_xdg_path` leaves `XDG_CONFIG_DIRS` alone once `xdg-xubuntu` is already in it, so the order set here sticks.

### 2. Pin the font and DPI

On its own, step 1 already brings back the Xubuntu defaults. I still pin the two values that matter in a directory of my own, `/etc/xdg/xrdp-local`, which comes first in `XDG_CONFIG_DIRS`. That way they don't depend on what a future Xubuntu package ships:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- /etc/xdg/xrdp-local/xfce4/xfconf/xfce-perchannel-xml/xsettings.xml -->
<channel name="xsettings" version="1.0">
  <property name="Xft" type="empty">
    <property name="DPI" type="int" value="96"/>
  </property>
  <property name="Gtk" type="empty">
    <property name="FontName" type="string" value="Noto Sans 9"/>
  </property>
</channel>
```

xfconf merges system channel files in `XDG_CONFIG_DIRS` order. These two properties win, and everything else (theme, icons, hinting) still comes from `/etc/xdg/xdg-xubuntu`.

Make sure the font is actually installed, or fontconfig quietly picks a substitute:

```sh
fc-list : family | grep -x "Noto Sans" || sudo apt-get install -y fonts-noto-core
```

### 3. Log off, don't disconnect

This is the one that catches people. A **disconnected** xrdp session is still running with the environment it started with. Reconnecting puts you back in the old session with the old font. Users have to **log off** from the XFCE menu and RDP in again.

## Checking it worked

You can simulate what a new xrdp login would get, without logging in:

```sh
XRDP_SESSION=1 DESKTOP_SESSION= XDG_CONFIG_DIRS= bash -c '
  . /etc/profile >/dev/null 2>&1
  . /etc/X11/Xsession.d/60x11-common_xdg_path
  echo "$DESKTOP_SESSION $XDG_CONFIG_DIRS"'
# xubuntu /etc/xdg/xrdp-local:/etc/xdg/xdg-xubuntu:/etc/xdg
```

After a fresh RDP login:

```sh
xfconf-query -c xsettings -p /Gtk/FontName   # Noto Sans 9
xfconf-query -c xsettings -p /Xft/DPI        # 96
```

To find who's still on old settings, look for any user with their own override, since a per-user `xsettings.xml` beats any system default:

```sh
grep -lE 'name="(FontName|DPI)"' \
  /home/*/.config/xfce4/xfconf/xfce-perchannel-xml/xsettings.xml 2>/dev/null
```

With that in place, the `+` buttons are back to `+` over RDP, and the app looks the same whether you're at the machine or a thousand kilometres away.

## Takeaways

- **xrdp doesn't start your display manager's session.** If your distro flavour customises the desktop through a session (like Xubuntu does with `xdg-xubuntu`), RDP users won't get those customisations unless you hand them over.
- **"Missing icon" can be a font problem.** When a Qt app looks different on two logins of the same machine, compare `xfconf-query -c xsettings` output before you touch the app.
- **Pin what your apps depend on.** Font and DPI were what this app's layout was built around, so they're now set explicitly instead of inherited.
