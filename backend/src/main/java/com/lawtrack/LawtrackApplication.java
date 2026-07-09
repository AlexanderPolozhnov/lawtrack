package com.lawtrack;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class LawtrackApplication {
    public static void main(String[] args) {
        SpringApplication.run(LawtrackApplication.class, args);
    }
}

