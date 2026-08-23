package com.keyrak.marketplace.web;

import com.keyrak.marketplace.service.UserService;
import com.keyrak.marketplace.web.dto.UserProfileResponse;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public UserProfileResponse getCurrentUser(JwtAuthenticationToken authentication) {
        return UserProfileResponse.from(
                userService.getByGoogleSubject(authentication.getToken().getSubject())
        );
    }
}
