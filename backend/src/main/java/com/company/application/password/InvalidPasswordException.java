package com.company.application.password;

import com.company.application.common.exception.ApplicationException;
import com.company.application.common.exception.ErrorCode;

public class InvalidPasswordException extends ApplicationException {

    public InvalidPasswordException(String message) {
        super(ErrorCode.UNAUTHORIZED, message);
    }
}
