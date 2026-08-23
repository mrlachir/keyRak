package com.keyrak.marketplace.security;

public class InvalidGoogleIdentityException extends RuntimeException {

    public InvalidGoogleIdentityException(String message) {
        super(message);
    }
}
