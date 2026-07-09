package com.lawtrack.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import java.io.IOException;

@Component
public class SecurityHeadersFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (response instanceof HttpServletResponse) {
            HttpServletResponse httpResponse = (HttpServletResponse) response;
            httpResponse.setHeader("X-Content-Type-Options", "nosniff");
            httpResponse.setHeader("X-Frame-Options", "DENY");
            httpResponse.setHeader("X-XSS-Protection", "1; mode=block");
            httpResponse.setHeader("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none';");
            httpResponse.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
            httpResponse.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
        }
        chain.doFilter(request, response);
    }
}
