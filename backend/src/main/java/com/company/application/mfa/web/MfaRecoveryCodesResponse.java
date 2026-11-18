package com.company.application.mfa.web;

import java.util.List;

public record MfaRecoveryCodesResponse(List<String> recoveryCodes) {
}
