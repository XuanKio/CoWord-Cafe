package org.example.cowordptit.config;

import org.example.cowordptit.security.JwtFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/", "/login", "/admin", "/user", "/index.html", "/*.html",
                    "/css/**", "/js/**", "/images/**", "/favicon.ico", "/error"
                ).permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api", "/api/health").permitAll()

                .requestMatchers(HttpMethod.GET, "/api/customers/*").hasAnyRole("USER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/requests").hasAnyRole("USER", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/requests/customer/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/sessions/customer/**").hasAnyRole("USER", "ADMIN")

                .requestMatchers(HttpMethod.GET, "/api/packages/**", "/api/menu/**").hasAnyRole("USER", "ADMIN")

                .requestMatchers(HttpMethod.GET, "/api/customers").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/customers").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/customers/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/customers/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/customers/**").hasRole("ADMIN")

                .requestMatchers(HttpMethod.POST, "/api/packages/**", "/api/menu/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/packages/**", "/api/menu/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/packages/**", "/api/menu/**").hasRole("ADMIN")

                .requestMatchers(HttpMethod.GET, "/api/sessions", "/api/sessions/active").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/sessions/checkin").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/sessions/*/checkout").hasRole("ADMIN")

                .requestMatchers(HttpMethod.GET, "/api/requests", "/api/requests/pending").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/requests/*/approve", "/api/requests/*/cancel").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/reports/**").hasRole("ADMIN")
                .requestMatchers("/api/payments/**").hasRole("ADMIN")

                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
