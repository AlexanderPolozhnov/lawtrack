package com.lawtrack.util;

public final class HtmlSanitizer {

    private HtmlSanitizer() {
        // Private constructor to prevent instantiation
    }

    /**
     * Sanitizes the input string by stripping HTML tags.
     *
     * @param input the raw input string
     * @return the sanitized string, or null if input was null
     */
    public static String sanitize(String input) {
        if (input == null) {
            return null;
        }
        // Remove HTML tags to prevent XSS injection
        return input.replaceAll("<[^>]*>", "").trim();
    }
}
