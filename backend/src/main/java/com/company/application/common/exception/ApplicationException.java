package com.company.application.common.exception;

import org.springframework.http.HttpStatus;

public class ApplicationException extends RuntimeException {

    private final ErrorCode errorCode;
    private final HttpStatus status;

    public ApplicationException(ErrorCode errorCode, String message) {
        this(errorCode, message, errorCode.defaultStatus(), null);
    }

    public ApplicationException(ErrorCode errorCode, String message, HttpStatus status) {
        this(errorCode, message, status, null);
    }

    public ApplicationException(ErrorCode errorCode, String message, HttpStatus status, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.status = status;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
