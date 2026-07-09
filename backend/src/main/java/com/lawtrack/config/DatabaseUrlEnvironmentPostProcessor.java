package com.lawtrack.config;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

@Order(Ordered.LOWEST_PRECEDENCE)
public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final Log log = LogFactory.getLog(DatabaseUrlEnvironmentPostProcessor.class);

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String dbUrl = environment.getProperty("DATABASE_URL");
        if (dbUrl != null && !dbUrl.trim().isEmpty()) {
            dbUrl = dbUrl.trim();
            Map<String, Object> props = new HashMap<>();
            if (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) {
                try {
                    URI uri = URI.create(dbUrl.replaceFirst("^postgres(ql)?://", "http://"));
                    String host = uri.getHost();
                    int port = uri.getPort() != -1 ? uri.getPort() : 5432;
                    String path = uri.getPath();
                    String query = uri.getQuery();

                    String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + (path != null ? path : "");
                    if (query != null && !query.isEmpty()) {
                        jdbcUrl += "?" + query;
                    } else if (host != null && (host.contains(".render.com") || host.contains(".neon.tech") || host.contains(".supabase."))) {
                        jdbcUrl += "?sslmode=require";
                    }

                    props.put("spring.datasource.url", jdbcUrl);

                    String userInfo = uri.getUserInfo();
                    if (userInfo != null && userInfo.contains(":")) {
                        String[] parts = userInfo.split(":", 2);
                        props.put("spring.datasource.username", parts[0]);
                        props.put("spring.datasource.password", parts[1]);
                    } else if (userInfo != null) {
                        props.put("spring.datasource.username", userInfo);
                    }
                    log.info("Parsed DATABASE_URL into JDBC URL: " + jdbcUrl + " (user: " + props.get("spring.datasource.username") + ")");
                } catch (Exception e) {
                    log.warn("Failed to parse DATABASE_URL as URI, fallback to direct string: " + e.getMessage());
                    if (!dbUrl.startsWith("jdbc:")) {
                        props.put("spring.datasource.url", "jdbc:" + dbUrl);
                    } else {
                        props.put("spring.datasource.url", dbUrl);
                    }
                }
            } else if (!dbUrl.startsWith("jdbc:")) {
                props.put("spring.datasource.url", "jdbc:" + dbUrl);
            } else {
                props.put("spring.datasource.url", dbUrl);
            }
            if (!props.isEmpty()) {
                environment.getPropertySources().addFirst(new MapPropertySource("databaseUrlEnvironmentProperties", props));
            }
        }
    }
}
