package com.company.application.audit;

/**
 * Best-effort location/device hints for IT-facing audit screens.
 * Full GeoIP can replace classifyIp later without changing the API.
 */
public final class AuditClientContext {

    private AuditClientContext() {
    }

    public record LocationHint(String country, String city) {
    }

    public static LocationHint classifyIp(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return new LocationHint(null, null);
        }
        String ip = ipAddress.trim();
        if (isLoopback(ip) || isPrivate(ip)) {
            return new LocationHint("Local network", "On-site / VPN");
        }
        return new LocationHint("Unknown", "Unknown");
    }

    public static String summarizeUserAgent(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return "Unknown device";
        }
        String ua = userAgent;
        String browser = "Browser";
        if (ua.contains("Edg/")) {
            browser = "Microsoft Edge";
        } else if (ua.contains("Chrome/") && !ua.contains("Chromium")) {
            browser = "Chrome";
        } else if (ua.contains("Firefox/")) {
            browser = "Firefox";
        } else if (ua.contains("Safari/") && !ua.contains("Chrome/")) {
            browser = "Safari";
        }

        String os = "unknown OS";
        if (ua.contains("Windows")) {
            os = "Windows";
        } else if (ua.contains("Android")) {
            os = "Android";
        } else if (ua.contains("iPhone") || ua.contains("iPad")) {
            os = "iOS";
        } else if (ua.contains("Mac OS X") || ua.contains("Macintosh")) {
            os = "macOS";
        } else if (ua.contains("Linux")) {
            os = "Linux";
        }

        return browser + " on " + os;
    }

    public static String truncateUa(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return null;
        }
        String trimmed = userAgent.trim();
        return trimmed.length() <= 512 ? trimmed : trimmed.substring(0, 512);
    }

    private static boolean isLoopback(String ip) {
        return "127.0.0.1".equals(ip) || "::1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip);
    }

    private static boolean isPrivate(String ip) {
        return ip.startsWith("10.")
                || ip.startsWith("192.168.")
                || ip.matches("172\\.(1[6-9]|2[0-9]|3[0-1])\\..*")
                || ip.startsWith("fc")
                || ip.startsWith("fd")
                || ip.startsWith("fe80:");
    }
}
