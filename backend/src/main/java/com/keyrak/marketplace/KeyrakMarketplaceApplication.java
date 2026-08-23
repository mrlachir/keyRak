package com.keyrak.marketplace;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class KeyrakMarketplaceApplication {

    public static void main(String[] args) {
        SpringApplication.run(KeyrakMarketplaceApplication.class, args);
    }
}
