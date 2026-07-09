package com.lawtrack.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
@Slf4j
public class AdminTokenFilter implements Filter {

    @Value("${app.admin-token:}")
    private String adminToken;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest && response instanceof HttpServletResponse) {
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            HttpServletResponse httpResponse = (HttpServletResponse) response;

            String path = httpRequest.getRequestURI();

            // Protect /api/ endpoints. Do not block swagger, api-docs or actuator.
            if (path.startsWith("/api/") && adminToken != null && !adminToken.isBlank()) {
                String headerToken = httpRequest.getHeader("X-Admin-Token");

                if (headerToken == null || !constantTimeEquals(headerToken, adminToken)) {
                    log.warn("Unauthorized request attempt to {} from IP: {}", path, httpRequest.getRemoteAddr());
                    httpResponse.setStatus(401); // Unauthorized
                    httpResponse.setContentType("application/json");
                    httpResponse.setCharacterEncoding("UTF-8");
                    httpResponse.getWriter().write("{\"message\": \"Неверный или отсутствующий API токен доступа.\"}");
                    return;
                }
            }
        }
        chain.doFilter(request, response);
    }

    private boolean constantTimeEquals(String str1, String str2) {
        byte[] a = str1.getBytes(StandardCharsets.UTF_8);
        byte[] b = str2.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(a, b);
    }
}
