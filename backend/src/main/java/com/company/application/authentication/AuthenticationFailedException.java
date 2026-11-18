package com.company.application.authentication;

import org.springframework.http.HttpStatus;

import com.company.application.common.exception.ApplicationException;
import com.company.application.common.exception.ErrorCode;

public class AuthenticationFailedException extends ApplicationException {

    public AuthenticationFailedException(String message) {
        super(ErrorCode.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED);
    }
}
