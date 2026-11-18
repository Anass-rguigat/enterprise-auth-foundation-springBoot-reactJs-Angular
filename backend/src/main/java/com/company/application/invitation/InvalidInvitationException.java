package com.company.application.invitation;

import com.company.application.common.exception.ApplicationException;
import com.company.application.common.exception.ErrorCode;

public class InvalidInvitationException extends ApplicationException {

    public InvalidInvitationException(String message) {
        super(ErrorCode.UNAUTHORIZED, message);
    }
}
