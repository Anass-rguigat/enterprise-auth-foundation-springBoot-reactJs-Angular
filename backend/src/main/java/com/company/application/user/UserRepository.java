package com.company.application.user;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailNormalized(String emailNormalized);

    boolean existsByEmailNormalized(String emailNormalized);

    boolean existsByPendingEmailNormalized(String pendingEmailNormalized);

    @Query("select u from User u left join fetch u.profile where u.id = :id")
    Optional<User> findByIdWithProfile(@Param("id") UUID id);

    @Query("select distinct u from User u left join fetch u.profile where u.id in :ids")
    java.util.List<User> findAllByIdWithProfile(@Param("ids") java.util.Collection<UUID> ids);

    @Query("""
            select u from User u left join u.profile p
            where (:status is null or u.status = :status)
              and (
                   :q is null or :q = ''
                   or lower(u.email) like lower(concat('%', :q, '%'))
                   or lower(coalesce(p.firstName, '')) like lower(concat('%', :q, '%'))
                   or lower(coalesce(p.lastName, '')) like lower(concat('%', :q, '%'))
              )
            """)
    Page<User> search(
            @Param("q") String q,
            @Param("status") UserStatus status,
            Pageable pageable
    );
}
