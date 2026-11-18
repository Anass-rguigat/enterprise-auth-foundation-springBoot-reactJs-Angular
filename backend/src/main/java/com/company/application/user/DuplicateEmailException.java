package com.company.application.user;

import org.springframework.http.HttpStatus;

import com.company.application.common.exception.ApplicationException;
import com.company.application.common.exception.ErrorCode;

public class DuplicateEmailException extends ApplicationException {

    public DuplicateEmailException(String email) {
        super(ErrorCode.CONFLICT, "Email is already registered: " + email, HttpStatus.CONFLICT);
    }
}
