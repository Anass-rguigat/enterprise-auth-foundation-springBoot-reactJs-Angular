package com.company.application.user;

import org.springframework.http.HttpStatus;

import com.company.application.common.exception.ApplicationException;
import com.company.application.common.exception.ErrorCode;

public class InvalidStatusTransitionException extends ApplicationException {

    public InvalidStatusTransitionException(UserStatus from, UserStatus to) {
        super(
                ErrorCode.CONFLICT,
                "Cannot transition user status from " + from + " to " + to,
                HttpStatus.CONFLICT
        );
    }
}
