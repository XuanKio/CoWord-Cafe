package org.example.cowordptit.security;

import org.example.cowordptit.service.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class SecurityAccessService {

    public boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(getCurrentRole());
    }

    public boolean isUser() {
        return "USER".equalsIgnoreCase(getCurrentRole());
    }

    public Long getCurrentUserId() {
        AuthenticatedUser principal = getPrincipal();
        return principal != null ? principal.getUserId() : null;
    }

    public void ensureAdminOrOwner(Long targetUserId) {
        if (isAdmin()) {
            return;
        }

        if (isUser()) {
            Long currentUserId = getCurrentUserId();
            if (currentUserId != null && currentUserId.equals(targetUserId)) {
                return;
            }
        }

        throw new ApiException(HttpStatus.FORBIDDEN, "Ban khong co quyen truy cap tai nguyen nay");
    }

    private String getCurrentRole() {
        AuthenticatedUser principal = getPrincipal();
        return principal != null ? principal.getRole() : null;
    }

    private AuthenticatedUser getPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof AuthenticatedUser authUser) {
            return authUser;
        }
        return null;
    }
}
