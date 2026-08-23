package com.keyrak.marketplace.security;

import com.keyrak.marketplace.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class GoogleUserSynchronizationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Test
    void authenticatedGoogleClaimsCreateAndReturnTheLocalUser() throws Exception {
        mockMvc.perform(get("/api/users/me")
                        .with(jwt().jwt(token -> token
                                .subject("google-account-123")
                                .claim("email", "Guest@Example.com")
                                .claim("email_verified", true)
                                .claim("name", "Marketplace Guest")
                                .claim("picture", "https://example.test/avatar.png"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("guest@example.com"))
                .andExpect(jsonPath("$.displayName").value("Marketplace Guest"))
                .andExpect(jsonPath("$.role").value("CLIENT"));

        assertThat(userRepository.findByGoogleSubject("google-account-123"))
                .isPresent()
                .get()
                .extracting("email")
                .isEqualTo("guest@example.com");
    }
}
