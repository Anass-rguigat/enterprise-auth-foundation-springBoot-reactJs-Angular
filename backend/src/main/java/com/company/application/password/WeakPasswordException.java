package com.company.application.password;

import com.company.application.common.exception.ApplicationException;
import com.company.application.common.exception.ErrorCode;

public class WeakPasswordException extends ApplicationException {

    public WeakPasswordException(String message) {
        super(ErrorCode.VALIDATION_FAILED, message);
    }
}
