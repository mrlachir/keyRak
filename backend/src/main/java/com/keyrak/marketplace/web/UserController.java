package com.keyrak.marketplace.web;

import com.keyrak.marketplace.service.UserService;
import com.keyrak.marketplace.web.dto.UserProfileResponse;
import com.keyrak.marketplace.web.dto.UpdateUserProfileRequest;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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

    @PutMapping("/me")
    public UserProfileResponse updateCurrentUser(
            @Valid @RequestBody UpdateUserProfileRequest request,
            JwtAuthenticationToken authentication
    ) {
        return UserProfileResponse.from(
                userService.updateProfile(authentication.getToken().getSubject(), request)
        );
    }

    @PutMapping(value = "/me/id-card", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserProfileResponse updateIdCard(
            @RequestPart("idCard") MultipartFile idCard,
            JwtAuthenticationToken authentication
    ) {
        return UserProfileResponse.from(userService.updateIdCard(authentication.getToken().getSubject(), idCard));
    }
}
