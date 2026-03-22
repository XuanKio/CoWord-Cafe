package org.example.cowordptit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CoWordPtitApplication {

    public static void main(String[] args) {
        SpringApplication.run(CoWordPtitApplication.class, args);
    }

}
