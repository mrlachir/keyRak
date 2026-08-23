# Reusable Components Extract: Google OAuth Bridge and Gemini AI

This extract targets `frontend/` and `backend/` in the SmartMail Pro repository.

Important repository facts:

- The frontend uses NextAuth Google OAuth with `session.strategy = "jwt"`.
- The backend does not generate or validate an application JWT in the current implementation.
- The backend identity bridge is `X-User-Email`, derived from the Google-authenticated NextAuth session and sent on REST requests.
- `JWT_SECRET` is not used anywhere in the repository. Add it only when you implement a real backend JWT issuer/filter in the new project.
- Gemini API keys are not read from `GEMINI_API_KEY` in the backend. They are saved per user through the Vault API, encrypted with AES/GCM, then decrypted before Gemini calls.

## 1. Google OAuth and Backend Identity Bridge

### Frontend Dependencies

From `frontend/package.json`:

```json
{
  "dependencies": {
    "next": "16.2.1",
    "next-auth": "^4.24.13",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "eslint": "^9",
    "eslint-config-next": "16.2.1",
    "tailwindcss": "^4"
  }
}
```

Fresh project install:

```bash
npm install next-auth
```

### Frontend Environment Variables

```env
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

Requested but not implemented in this repo:

```env
JWT_SECRET=not-used-by-current-repository-code
```

### NextAuth Route

Extracted from `frontend/src/app/api/auth/[...nextauth]/route.js`.

This file has `jwt` and `session` callbacks. There is no `signIn` callback and it does not call the backend directly.

```js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
```

### Session Provider

Extracted from `frontend/src/components/Providers.js`.

```js
"use client";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

### Google Sign-In Button

Extracted from `frontend/src/components/AppShell.js`.

```js
"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  // 🔴 If not logged in, show your exact SSO button
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">SmartMail Pro</h1>
            <p className="text-gray-500">Connectez-vous pour accéder au tableau de bord</p>
        </div>
        <button 
          onClick={() => signIn('google')} 
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 transition text-white font-bold rounded shadow"
        >
          Continuer avec Google SSO
        </button>
      </div>
    );
  }

  // 🟢 If logged in, show Sidebar + Content
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
```

### Root Layout Wiring

Extracted from `frontend/src/app/layout.js`.

```js
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import AppShell from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "SmartMail Pro",
  description: "Marketing Automation Platform",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-gray-900">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
```

### Backend User Sync Call

Extracted from `frontend/src/app/subscribers/page.js`.

This is the actual backend bridge used by the repository. The Google-authenticated email is sent to Spring Boot in `X-User-Email`.

```js
// THE HANDSHAKE: Register user and fetch their specific data
useEffect(() => {
  if (session?.user?.email) {
    const syncAndFetch = async () => {
      try {
        // 1. Tell backend the user is here
        await fetch("http://localhost:8080/api/users/sync", {
          method: "POST",
          headers: { "X-User-Email": session.user.email }
        });
        // 2. Fetch their isolated data
        fetchSubscribers();
      } catch (error) {
        console.error("Failed to sync user", error);
      }
    };
    syncAndFetch();
  }
}, [session]);
```

Other frontend calls follow the same pattern:

```js
headers: { "X-User-Email": session.user.email }
```

## Backend Auth Bridge

### Maven Dependencies for Spring Boot 3

The repository uses Gradle and Spring Boot `4.0.4`; for a new Spring Boot 3 Maven project, use the Boot 3 starter names below.

```xml
<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>

  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
  </dependency>

  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
  </dependency>

  <!-- Include only if you implement real JWT validation in the new project. -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
  </dependency>

  <dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
  </dependency>

  <dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
  </dependency>
</dependencies>
```

### Backend Properties

Extracted baseline from `backend/src/main/resources/application.properties`.

For a fresh project, keep secrets in environment variables rather than hardcoding them.

```properties
spring.application.name=backend
encryption.secret-key=${ENCRYPTION_SECRET_KEY}

spring.datasource.url=jdbc:mysql://localhost:3306/smartmaildb?allowPublicKeyRetrieval=true&useSSL=false
spring.datasource.username=smartmail_user
spring.datasource.password=smartmail_password
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB

spring.web.resources.static-locations=classpath:/static/,file:uploads/

groq.api.key=${GROQ_API_KEY}
```

Requested variables status:

```env
GOOGLE_CLIENT_ID=used-by-frontend-nextauth
GEMINI_API_KEY=not-read-from-env-in-this-repo; stored per-user through /api/vault
JWT_SECRET=not-implemented-in-this-repo
ENCRYPTION_SECRET_KEY=required-for-vault-encryption-in-a-fresh-project
```

### Security Configuration

Extracted from `backend/src/main/java/com/example/backend/security/SecurityConfig.java`.

This configuration does not validate JWTs. It permits the API endpoints and relies on `X-User-Email` for user isolation in controllers/services.

```java
package com.example.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults()) // Enables CORS so Next.js can talk to Spring Boot
                .csrf(csrf -> csrf.disable()) // Disables CSRF protection so POST requests work
                .authorizeHttpRequests(auth -> auth
                        // .requestMatchers("/api/**").permitAll()     // Temporarily bypass security for all APIs
                        // .requestMatchers("/uploads/**").permitAll() // Allows Next.js to view the physical images
                        .requestMatchers("/api/vault/**").permitAll() // Opens our specific endpoints
                        .requestMatchers("/api/subscribers/**").permitAll() // Add this line
                        .requestMatchers("/api/segments/**").permitAll() // Add this line
                        .requestMatchers("/api/users/**").permitAll() // ADD THIS LINE
                        .requestMatchers("/api/ai/**").permitAll() // ADD THIS LINE
                        .requestMatchers("/api/templates/**").permitAll() // ADD THIS LINE
                        .requestMatchers("/api/media/**").permitAll() // ADD THIS
                        .requestMatchers("/uploads/**").permitAll()   // ADD THIS (Allows Next.js to view the physical images)

                        .requestMatchers("/api/campaigns/**").permitAll() // ADD THIS (Allows Next.js to view the physical images)
                        .requestMatchers("/api/track/**").permitAll()
                        


                        
                        .anyRequest().authenticated());
        return http.build();
    }
}
```

### User Entity

Extracted from `backend/src/main/java/com/example/backend/entity/User.java`.

```java
package com.example.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
```

### User Repository

Extracted from `backend/src/main/java/com/example/backend/repository/UserRepository.java`.

```java
package com.example.backend.repository;

import com.example.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}
```

### User Service

Extracted from `backend/src/main/java/com/example/backend/service/UserService.java`.

This checks whether the Google-authenticated email already exists and creates the backend user if it does not.

````java
package com.example.backend.service;

import com.example.backend.entity.User;
import com.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public User getOrCreateUser(String email) {
        if (email == null || email.isEmpty()) {
            throw new RuntimeException("User email cannot be null");
        }

        return userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(email);
            return userRepository.save(newUser);
        });
    }
}
````

### User Controller

Extracted from `backend/src/main/java/com/example/backend/controller/UserController.java`.

```java
package com.example.backend.controller;

import com.example.backend.entity.User;
import com.example.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:3000")
public class UserController {

    @Autowired
    private UserService userService;

    // The frontend will hit this endpoint the moment a user logs in
    @PostMapping("/sync")
    public ResponseEntity<User> syncUser(@RequestHeader("X-User-Email") String email) {
        return ResponseEntity.ok(userService.getOrCreateUser(email));
    }
}
```

### JWT Generation and Validation Status

No backend JWT generation method, JWT response DTO, JWT filter, `JwtEncoder`, `JwtDecoder`, or `JWT_SECRET` configuration was found in this repository.

The reusable authentication code here is therefore:

```txt
Google OAuth in NextAuth
NextAuth JWT session storage
X-User-Email bridge to Spring Boot
Spring Boot user sync and per-user data ownership
```

## 2. Gemini AI Integration

### AI Backend Dependencies

The Gemini implementation uses:

- `RestTemplate` from Spring Web.
- Jackson `ObjectMapper` and `JsonNode`.
- JPA repositories for per-user Vault lookup.
- `EncryptionUtil` for decrypting the saved Gemini key.

Spring Boot 3 Maven dependencies:

```xml
<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>

  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
  </dependency>

  <dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
  </dependency>

  <dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
  </dependency>
</dependencies>
```

### Gemini Key Handling: Vault Entity

Extracted from `backend/src/main/java/com/example/backend/entity/Vault.java`.

```java
package com.example.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "vault")
public class Vault {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String geminiApiKeyEncrypted;

    private String gmailOauthTokenEncrypted;

    // THE UPGRADE: Maps the Vault strictly to the authenticated User
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    @JsonIgnore
    private User user;
}
```

### Gemini Key Handling: Vault Repository

Extracted from `backend/src/main/java/com/example/backend/repository/VaultRepository.java`.

```java
package com.example.backend.repository;

import com.example.backend.entity.Vault;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface VaultRepository extends JpaRepository<Vault, Long> {
    // Delete the old findByUserId method and replace it with this:
    Optional<Vault> findByUserEmail(String email);
}
```

### Gemini Key Handling: Encryption Utility

Extracted from `backend/src/main/java/com/example/backend/security/EncryptionUtil.java`.

`encryption.secret-key` must be a valid AES key length for AES/GCM. Use 16, 24, or 32 bytes.

```java
package com.example.backend.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class EncryptionUtil {

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Value("${encryption.secret-key}")
    private String secretKey;

    public String encrypt(String plainText) {
        if (plainText == null || plainText.isEmpty()) return null;
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            SECURE_RANDOM.nextBytes(iv);

            SecretKeySpec key = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), ALGORITHM);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, key, parameterSpec);

            byte[] encryptedBytes = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + encryptedBytes.length);
            byteBuffer.put(iv);
            byteBuffer.put(encryptedBytes);

            return Base64.getEncoder().encodeToString(byteBuffer.array());

        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Security configuration error during encryption", e);
        }
    }

    public String decrypt(String encryptedText) {
        if (encryptedText == null || encryptedText.isEmpty()) return null;
        try {
            byte[] decodedBytes = Base64.getDecoder().decode(encryptedText);

            byte[] iv = new byte[GCM_IV_LENGTH];
            System.arraycopy(decodedBytes, 0, iv, 0, iv.length);

            byte[] encryptedBytes = new byte[decodedBytes.length - GCM_IV_LENGTH];
            System.arraycopy(decodedBytes, GCM_IV_LENGTH, encryptedBytes, 0, encryptedBytes.length);

            SecretKeySpec key = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), ALGORITHM);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, key, parameterSpec);

            byte[] decryptedBytes = cipher.doFinal(encryptedBytes);
            return new String(decryptedBytes, StandardCharsets.UTF_8);

        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Security configuration error during decryption", e);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("Invalid Base64 payload provided for decryption", e);
        }
    }
}
```

### Gemini Key Handling: Vault Service

Extracted from `backend/src/main/java/com/example/backend/service/VaultService.java`.

The frontend sends the raw Gemini key in `geminiApiKeyEncrypted`; the service encrypts it before saving.

````java
package com.example.backend.service;

import com.example.backend.entity.User;
import com.example.backend.entity.Vault;
import com.example.backend.repository.VaultRepository;
import com.example.backend.security.EncryptionUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class VaultService {

    @Autowired
    private VaultRepository vaultRepository;

    @Autowired
    private UserService userService;

    // THE FIX: Inject the encryption engine
    @Autowired
    private EncryptionUtil encryptionUtil;

    public Vault getVaultByUserEmail(String email) {
        return vaultRepository.findByUserEmail(email).orElse(null);
    }

    public Vault saveVault(Vault vault, String email) {
        User user = userService.getOrCreateUser(email);
        Vault existingVault = vaultRepository.findByUserEmail(email).orElse(new Vault());

        existingVault.setUser(user);

        try {
            // THE FIX: Intercept the raw text and encrypt it BEFORE saving to the database
            if (vault.getGeminiApiKeyEncrypted() != null && !vault.getGeminiApiKeyEncrypted().isEmpty()) {
                String encryptedKey = encryptionUtil.encrypt(vault.getGeminiApiKeyEncrypted());
                existingVault.setGeminiApiKeyEncrypted(encryptedKey);
            }

            if (vault.getGmailOauthTokenEncrypted() != null && !vault.getGmailOauthTokenEncrypted().isEmpty()) {
                String encryptedToken = encryptionUtil.encrypt(vault.getGmailOauthTokenEncrypted());
                existingVault.setGmailOauthTokenEncrypted(encryptedToken);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to encrypt sensitive data before saving.");
        }

        return vaultRepository.save(existingVault);
    }
}
````

### Gemini Key Handling: Vault Controller

Extracted from `backend/src/main/java/com/example/backend/controller/VaultController.java`.

````java
package com.example.backend.controller;

import com.example.backend.entity.Vault;
import com.example.backend.service.VaultService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/vault")
@CrossOrigin(origins = "http://localhost:3000")
public class VaultController {

    @Autowired
    private VaultService vaultService;

    @GetMapping
    public ResponseEntity<Vault> getVault(@RequestHeader("X-User-Email") String userEmail) {
        return ResponseEntity.ok(vaultService.getVaultByUserEmail(userEmail));
    }

    @PostMapping
    public ResponseEntity<Vault> saveVault(@RequestBody Vault vault, @RequestHeader("X-User-Email") String userEmail) {
        return ResponseEntity.ok(vaultService.saveVault(vault, userEmail));
    }
}
````

### Frontend Vault Save Call

Extracted from `frontend/src/app/settings/page.js`.

```js
const handleSave = async (e) => {
  e.preventDefault();
  setMessage("Saving...");
  try {
    const res = await fetch("http://localhost:8080/api/vault", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": session.user.email // PASS IDENTIFIER
      },
      body: JSON.stringify({ geminiApiKeyEncrypted: apiKey })
    });
    if (res.ok) {
      setMessage("✅ Vault updated securely.");
      setApiKey("");
      setIsConfigured(true);
    } else {
      setMessage("❌ Failed to save to Vault.");
    }
  } catch (error) {
    setMessage("❌ Error connecting to server.");
  }
};
```

## Gemini Text and Template Service

Extracted from `backend/src/main/java/com/example/backend/service/AiTemplateService.java`.

This class builds email-template prompts, calls Gemini, parses `candidates[0].content.parts[0].text`, cleans markdown fences, and ensures HTML boilerplate.

````java
package com.example.backend.service;

import com.example.backend.entity.Vault;
import com.example.backend.repository.VaultRepository;
import com.example.backend.security.EncryptionUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class AiTemplateService {

    @Autowired
    private VaultRepository vaultRepository;

    @Autowired
    private EncryptionUtil encryptionUtil;

    // Inject the Groq key from application.properties
    @Value("${groq.api.key}")
    private String groqApiKey;

    public String generateHtmlTemplate(String topic, String provider, String userEmail) {
        String systemRules = "You are a premium SaaS email designer. You MUST return ONLY raw, valid HTML. "
                + "CRITICAL RULES:\n"
                + "1. NO <style> blocks. NO <div> tags. NO classes. You MUST use strict <table> layouts and inline CSS (style=\"...\") exclusively.\n"
                + "2. You MUST use this EXACT skeleton as the base for your output:\n\n"
                + "<!DOCTYPE html>\n"
                + "<html>\n"
                + "<head>\n"
                + "  <meta charset=\"utf-8\">\n"
                + "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"
                + "</head>\n"
                + "<body style=\"margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif;\">\n"
                + "  <table width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#f8fafc; padding:40px 0;\">\n"
                + "    <tr><td align=\"center\">\n"
                + "      <table width=\"100%\" max-width=\"600\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px; background-color:#ffffff; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.05); overflow:hidden;\">\n"
                + "        \n"
                + "        <tr><td align=\"center\" style=\"padding:30px; background-color:#0f172a; color:#ffffff; font-size:24px; font-weight:bold;\">HEADER HERE</td></tr>\n"
                + "        <tr><td style=\"padding:30px; color:#334155; font-size:16px; line-height:1.6;\">CONTENT HERE</td></tr>\n"
                + "      </table>\n"
                + "    </td></tr>\n"
                + "  </table>\n"
                + "</body>\n"
                + "</html>\n\n"
                + "3. ALL buttons MUST be built as a <table> inside a <td> with a background color. Never just an <a> tag.\n"
                + "4. Make the design modern, clean, and professional.\n"
                + "Generate the requested email by populating and extending this exact skeleton. Return ONLY the HTML code. Do NOT wrap in markdown.";
        String prompt = systemRules + "\n\nNow generate a highly converting, professional email template for: '" + topic + "'.";

        String rawHtml;
        if ("groq".equalsIgnoreCase(provider)) {
            rawHtml = callGroqApi(prompt);
        } else {
            rawHtml = callGeminiApi(prompt, userEmail);
        }
        return ensureHtmlBoilerplate(rawHtml);
    }

    public String refineHtmlTemplate(String currentHtml, String instructions, String provider, String userEmail) {
        String systemRules = "You are a premium SaaS email designer. You MUST return ONLY raw, valid HTML. "
                + "CRITICAL RULES:\n"
                + "1. NO <style> blocks. NO <div> tags. NO classes. You MUST use strict <table> layouts and inline CSS (style=\"...\") exclusively.\n"
                + "2. You MUST use this EXACT skeleton as the base for your output:\n\n"
                + "<!DOCTYPE html>\n"
                + "<html>\n"
                + "<head>\n"
                + "  <meta charset=\"utf-8\">\n"
                + "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"
                + "</head>\n"
                + "<body style=\"margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif;\">\n"
                + "  <table width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#f8fafc; padding:40px 0;\">\n"
                + "    <tr><td align=\"center\">\n"
                + "      <table width=\"100%\" max-width=\"600\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px; background-color:#ffffff; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.05); overflow:hidden;\">\n"
                + "        \n"
                + "        <tr><td align=\"center\" style=\"padding:30px; background-color:#0f172a; color:#ffffff; font-size:24px; font-weight:bold;\">HEADER HERE</td></tr>\n"
                + "        <tr><td style=\"padding:30px; color:#334155; font-size:16px; line-height:1.6;\">CONTENT HERE</td></tr>\n"
                + "      </table>\n"
                + "    </td></tr>\n"
                + "  </table>\n"
                + "</body>\n"
                + "</html>\n\n"
                + "3. ALL buttons MUST be built as a <table> inside a <td> with a background color. Never just an <a> tag.\n"
                + "4. Make the design modern, clean, and professional.\n"
                + "Generate the requested email by populating and extending this exact skeleton. Return ONLY the HTML code. Do NOT wrap in markdown.";
        String prompt = systemRules
                + "\n\nHere is the current HTML email:\n\n" + currentHtml + "\n\n"
                + "Apply these changes: '" + instructions + "'. Preserve all existing <table> structure and inline styles. "
                + "Return the fully updated raw HTML only.";

        String rawHtml;
        if ("groq".equalsIgnoreCase(provider)) {
            rawHtml = callGroqApi(prompt);
        } else {
            rawHtml = callGeminiApi(prompt, userEmail);
        }
        return ensureHtmlBoilerplate(rawHtml);
    }

    // --- THE NEW GROQ ENGINE ---
    private String callGroqApi(String prompt) {
        if (groqApiKey == null || groqApiKey.isEmpty()) throw new RuntimeException("Groq API Key is missing in properties.");

        String url = "https://api.groq.com/openai/v1/chat/completions";
        ObjectMapper mapper = new ObjectMapper();
        String requestBody;

        try {
            Map<String, Object> message = Map.of("role", "user", "content", prompt);
            Map<String, Object> requestMap = Map.of(
                    "model", "llama-3.1-8b-instant",
                    "messages", List.of(message),
                    "temperature", 0.7
            );
            requestBody = mapper.writeValueAsString(requestMap);
        } catch (Exception e) {
            throw new RuntimeException("Failed to construct Groq request body.");
        }

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey); // Groq uses Bearer token authentication

        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

        try {
            String response = restTemplate.postForObject(url, entity, String.class);
            JsonNode rootNode = mapper.readTree(response);
            String aiText = rootNode.path("choices").get(0).path("message").path("content").asText();

            return cleanMarkdown(aiText);
        } catch (Exception e) {
            throw new RuntimeException("Groq AI Error: " + e.getMessage());
        }
    }

    // --- YOUR EXISTING GEMINI ENGINE ---
    private String callGeminiApi(String prompt, String userEmail) {
        Vault vault = vaultRepository.findByUserEmail(userEmail).orElseThrow(() -> new RuntimeException("API Vault not configured."));
        String apiKey;
        try { apiKey = encryptionUtil.decrypt(vault.getGeminiApiKeyEncrypted()).trim(); }
        catch (Exception e) { throw new RuntimeException("Failed to decrypt Gemini Key."); }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
        ObjectMapper mapper = new ObjectMapper();
        String requestBody;
        try {
            requestBody = mapper.writeValueAsString(Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))));
        } catch (Exception e) { throw new RuntimeException("Failed to construct request."); }

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

        try {
            String response = restTemplate.postForObject(url, entity, String.class);
            JsonNode rootNode = mapper.readTree(response);
            String aiText = rootNode.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
            return cleanMarkdown(aiText);
        } catch (Exception e) { throw new RuntimeException("Gemini AI Error: " + e.getMessage()); }
    }

    private String cleanMarkdown(String text) {
        if (text.startsWith("```html")) return text.replace("```html", "").replace("```", "").trim();
        if (text.startsWith("```")) return text.replace("```", "").trim();
        return text.trim();
    }

    private String ensureHtmlBoilerplate(String htmlContent) {
        if (htmlContent == null) return "";

        String trimmedContent = htmlContent.trim();
        if (trimmedContent.equalsIgnoreCase("null") || trimmedContent.isEmpty()) {
            return "";
        }
        
        String lowerCaseHtml = trimmedContent.toLowerCase();
        
        // If it already has the doctype or html tag, trust it and return
        if (lowerCaseHtml.startsWith("<!doctype html>") || lowerCaseHtml.startsWith("<html>")) {
            return htmlContent;
        }

        // If it's missing, wrap the LLM's raw table output in the unbreakable email shell
        return "<!DOCTYPE html>\n"
             + "<html>\n"
             + "<head>\n"
             + "  <meta charset=\"utf-8\">\n"
             + "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"
             + "</head>\n"
             + "<body style=\"margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased;\">\n"
             + "  " + htmlContent + "\n"
             + "</body>\n"
             + "</html>";
    }
}
````

## Gemini Segment Suggestion Service

Extracted from `backend/src/main/java/com/example/backend/service/AiSegmentService.java`.

This class builds segment prompts from subscriber data, calls Gemini, parses `candidates[0].content.parts[0].text`, and strips JSON markdown fences.

````java
package com.example.backend.service;

import com.example.backend.entity.Segment;
import com.example.backend.entity.Subscriber;
import com.example.backend.entity.Vault;
import com.example.backend.repository.SegmentRepository;
import com.example.backend.repository.VaultRepository;
import com.example.backend.security.EncryptionUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AiSegmentService {

    @Autowired private SubscriberService subscriberService;
    @Autowired private VaultRepository vaultRepository;
    @Autowired private EncryptionUtil encryptionUtil;
    @Autowired private SegmentRepository segmentRepository;

    @Value("${groq.api.key}")
    private String groqApiKey;

    public String getSuggestedSegments(String provider, String userEmail) {
        List<Subscriber> userSubscribers = subscriberService.getAllSubscribers(userEmail);
        if (userSubscribers.isEmpty()) throw new RuntimeException("You have no subscribers. Upload a CSV first.");

        List<Segment> existingSegments = segmentRepository.findByUserEmail(userEmail);
        String existingSegmentNames = existingSegments.isEmpty() ? "None" :
                existingSegments.stream().map(Segment::getName).collect(Collectors.joining(", "));

        Map<String, Set<String>> columnSamples = new HashMap<>();
        columnSamples.put("status", new HashSet<>());

        for (Subscriber sub : userSubscribers) {
            columnSamples.get("status").add(sub.getStatus());
            if (sub.getCustomAttributes() != null) {
                for (Map.Entry<String, String> entry : sub.getCustomAttributes().entrySet()) {
                    columnSamples.putIfAbsent(entry.getKey(), new HashSet<>());
                    if (columnSamples.get(entry.getKey()).size() < 5) {
                        columnSamples.get(entry.getKey()).add(entry.getValue());
                    }
                }
            }
        }

        StringBuilder dataContext = new StringBuilder();
        for (Map.Entry<String, Set<String>> entry : columnSamples.entrySet()) {
            dataContext.append("- ").append(entry.getKey()).append(" (Sample values found: ").append(String.join(", ", entry.getValue())).append(")\n");
        }

        String prompt = "You are a data-driven marketing expert. Here is my database context:\n" + dataContext.toString()
                + "\nCRITICAL RULE: The user already has these segments: [" + existingSegmentNames + "]. Do not suggest these. "
                + "Invent 3 NEW distinct segments based on the data provided.\n"
                + "You MUST return ONLY a raw JSON array of objects. Do not include any conversational text or markdown formatting.\n"
                + "Return a JSON object with 'name', 'description', and 'rules'. The 'rules' must be a JSON array in this format: [{\"column\":\"attribute_name\", \"value\":\"attribute_value\"}].";

        if ("groq".equalsIgnoreCase(provider)) {
            return callGroqApi(prompt);
        } else {
            return callGeminiApi(prompt, userEmail);
        }
    }

    private String callGroqApi(String prompt) {
        if (groqApiKey == null || groqApiKey.isEmpty()) throw new RuntimeException("Groq API Key is missing in properties.");

        String url = "https://api.groq.com/openai/v1/chat/completions";
        ObjectMapper mapper = new ObjectMapper();
        String requestBody;

        try {
            requestBody = mapper.writeValueAsString(Map.of(
                    "model", "llama-3.1-8b-instant",

                    "messages", List.of(Map.of("role", "user", "content", prompt)),
                    "temperature", 0.7
            ));
        } catch (Exception e) { throw new RuntimeException("Failed to construct Groq request body."); }

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        try {
            String response = restTemplate.postForObject(url, new HttpEntity<>(requestBody, headers), String.class);
            return cleanJson(mapper.readTree(response).path("choices").get(0).path("message").path("content").asText());
        } catch (Exception e) { throw new RuntimeException("Groq API Error: " + e.getMessage()); }
    }

    private String callGeminiApi(String prompt, String userEmail) {
        Vault vault = vaultRepository.findByUserEmail(userEmail).orElseThrow(() -> new RuntimeException("API Vault not configured."));
        String apiKey;
        try { apiKey = encryptionUtil.decrypt(vault.getGeminiApiKeyEncrypted()).trim(); }
        catch (Exception e) { throw new RuntimeException("Failed to decrypt Gemini API Key."); }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
        ObjectMapper mapper = new ObjectMapper();
        String requestBody;

        try {
            requestBody = mapper.writeValueAsString(Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))));
        } catch (Exception e) { throw new RuntimeException("Failed to construct AI request body."); }

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            String response = restTemplate.postForObject(url, new HttpEntity<>(requestBody, headers), String.class);
            return cleanJson(mapper.readTree(response).path("candidates").get(0).path("content").path("parts").get(0).path("text").asText());
        } catch (Exception e) { throw new RuntimeException("Gemini API Error: " + e.getMessage()); }
    }

    private String cleanJson(String text) {
        if (text.startsWith("```json")) return text.replace("```json", "").replace("```", "").trim();
        if (text.startsWith("```")) return text.replace("```", "").trim();
        return text.trim();
    }
}
````

## Gemini Image Service

Extracted from `backend/src/main/java/com/example/backend/service/AiImageService.java`.

This class calls `gemini-2.5-flash-image:generateContent`, requests `TEXT` and `IMAGE` response modalities, reads `inlineData.data`, base64-decodes it, and saves the bytes through `MediaService`.

```java
package com.example.backend.service;

import com.example.backend.entity.Media;
import com.example.backend.entity.Vault;
import com.example.backend.repository.VaultRepository;
import com.example.backend.security.EncryptionUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class AiImageService {

    private final MediaService mediaService;
    private final VaultRepository vaultRepository;
    private final EncryptionUtil encryptionUtil;

    // Constructor Injection
    public AiImageService(MediaService mediaService, VaultRepository vaultRepository, EncryptionUtil encryptionUtil) {
        this.mediaService = mediaService;
        this.vaultRepository = vaultRepository;
        this.encryptionUtil = encryptionUtil;
    }

    public Media generateAndSaveImage(String prompt, String provider, String userEmail) {
        // Route the request based on the UI toggle
        if ("gemini".equalsIgnoreCase(provider)) {
            return generateWithGemini(prompt, userEmail);
        } else {
            return generateWithPollinations(prompt, userEmail);
        }
    }

    private Media generateWithPollinations(String prompt, String userEmail) {
        try {
            String url = UriComponentsBuilder.fromUriString("https://image.pollinations.ai/prompt/{prompt}")
                    .queryParam("width", "800")
                    .queryParam("height", "600")
                    .queryParam("nologo", "true")
                    .buildAndExpand(prompt)
                    .encode()
                    .toUriString();

            RestTemplate restTemplate = new RestTemplate();
            byte[] imageBytes = restTemplate.getForObject(url, byte[].class);

            if (imageBytes == null || imageBytes.length == 0) {
                throw new RuntimeException("Free AI returned empty data.");
            }

            return mediaService.saveMediaFromBytes(imageBytes, "pollinations_ai.jpg", "image/jpeg", userEmail);

        } catch (Exception e) {
            throw new RuntimeException("Free AI Image Error: " + e.getMessage());
        }
    }

    private Media generateWithGemini(String prompt, String userEmail) {
        Vault vault = vaultRepository.findByUserEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("API Vault not configured."));

        String apiKey;
        try {
            apiKey = encryptionUtil.decrypt(vault.getGeminiApiKeyEncrypted()).trim();
        } catch (Exception e) {
            throw new RuntimeException("Failed to decrypt Gemini API Key.");
        }

        if (apiKey.isEmpty()) throw new RuntimeException("API Key is empty.");

        String baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=";
        String url = baseUrl + apiKey;

        ObjectMapper mapper = new ObjectMapper();
        String requestBody;
        try {
            Map<String, Object> textPart = Map.of("text", prompt);
            Map<String, Object> partContainer = Map.of("parts", List.of(textPart));
            Map<String, Object> generationConfig = Map.of("responseModalities", List.of("TEXT", "IMAGE"));

            Map<String, Object> requestMap = Map.of(
                    "contents", List.of(partContainer),
                    "generationConfig", generationConfig
            );
            requestBody = mapper.writeValueAsString(requestMap);
        } catch (Exception e) {
            throw new RuntimeException("Failed to construct AI request body.");
        }

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

        try {
            String response = restTemplate.postForObject(url, entity, String.class);
            JsonNode rootNode = mapper.readTree(response);

            if (!rootNode.has("candidates")) {
                throw new RuntimeException("Google rejected the request.");
            }

            JsonNode partsArray = rootNode.path("candidates").get(0).path("content").path("parts");
            String base64Image = null;
            String mimeType = "image/png";

            for (JsonNode part : partsArray) {
                if (part.has("inlineData")) {
                    base64Image = part.path("inlineData").path("data").asText();
                    mimeType = part.path("inlineData").path("mimeType").asText("image/png");
                    break;
                }
            }

            if (base64Image == null || base64Image.isEmpty()) {
                throw new RuntimeException("Google AI returned empty image.");
            }

            byte[] imageBytes = Base64.getDecoder().decode(base64Image);
            return mediaService.saveMediaFromBytes(imageBytes, "gemini_image.png", mimeType, userEmail);

        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().value() == 429) {
                throw new RuntimeException("API Quota Exceeded. Image generation requires a paid Google AI Studio tier.");
            } else {
                throw new RuntimeException("Google API Error: " + e.getStatusCode().value());
            }
        } catch (Exception e) {
            throw new RuntimeException("AI Image Error: " + e.getMessage());
        }
    }
}
```

## AI Controller

Extracted from `backend/src/main/java/com/example/backend/controller/AiController.java`.

Endpoints exposed to the frontend:

- `GET /api/ai/suggest-segments?provider=gemini`
- `POST /api/ai/generate-template`
- `POST /api/ai/refine-template`
- `POST /api/ai/generate-image`
- `POST /api/ai/wizard-generate-template`

All use `X-User-Email`.

````java
package com.example.backend.controller;

import com.example.backend.entity.Template;
import com.example.backend.entity.User;
import com.example.backend.repository.TemplateRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.AiImageService;
import com.example.backend.service.AiSegmentService;
import com.example.backend.service.AiTemplateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "http://localhost:3000")
public class AiController {

    @Autowired
    private AiSegmentService aiSegmentService;

    @Autowired
    private AiTemplateService aiTemplateService;

    @Autowired
    private AiImageService aiImageService;

    // Injections required for the new Wizard Endpoint to save templates
    @Autowired
    private TemplateRepository templateRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/suggest-segments")
    public ResponseEntity<?> suggestSegments(
            @RequestParam(defaultValue = "groq") String provider,
            @RequestHeader("X-User-Email") String userEmail) {
        try {
            String jsonArray = aiSegmentService.getSuggestedSegments(provider, userEmail);
            return ResponseEntity.ok(jsonArray);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/generate-template")
    public ResponseEntity<?> generateTemplate(@RequestBody Map<String, String> payload, @RequestHeader("X-User-Email") String userEmail) {
        try {
            String topic = payload.get("topic");
            String provider = payload.getOrDefault("provider", "groq");
            if (topic == null || topic.trim().isEmpty()) throw new RuntimeException("Topic required.");

            return ResponseEntity.ok(Map.of("html", aiTemplateService.generateHtmlTemplate(topic, provider, userEmail)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/refine-template")
    public ResponseEntity<?> refineTemplate(@RequestBody Map<String, String> payload, @RequestHeader("X-User-Email") String userEmail) {
        try {
            String currentHtml = payload.get("currentHtml");
            String instructions = payload.get("instructions");
            String provider = payload.getOrDefault("provider", "groq");

            if (currentHtml == null || instructions == null) throw new RuntimeException("HTML and instructions required.");

            return ResponseEntity.ok(Map.of("html", aiTemplateService.refineHtmlTemplate(currentHtml, instructions, provider, userEmail)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/generate-image")
    public ResponseEntity<?> generateImage(@RequestBody Map<String, String> payload, @RequestHeader("X-User-Email") String userEmail) {
        try {
            String prompt = payload.get("prompt");
            String provider = payload.getOrDefault("provider", "pollinations");

            if (prompt == null || prompt.trim().isEmpty()) {
                throw new RuntimeException("Image prompt is required.");
            }

            return ResponseEntity.ok(aiImageService.generateAndSaveImage(prompt, provider, userEmail));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // =====================================================================================
    // SPRINT 9: WIZARD SPECIFIC ENDPOINT
    // =====================================================================================
    @PostMapping("/wizard-generate-template")
    public ResponseEntity<?> generateWizardTemplate(@RequestBody Map<String, String> payload, @RequestHeader("X-User-Email") String userEmail) {
        try {
            String campaignName = payload.get("campaignName");
            String segmentName = payload.get("segmentName");
            String provider = payload.getOrDefault("provider", "groq");

            // 1. Build the prompt
            String prompt = "Act as an expert email marketer. Write a highly converting HTML email template for a campaign named '"
                    + campaignName + "' targeting an audience of '" + segmentName
                    + "'. Use modern inline CSS. Return ONLY valid HTML code. No markdown blocks like ```html.";

            // 2. Call your existing AI service
            String generatedHtml = aiTemplateService.generateHtmlTemplate(prompt, provider, userEmail);

            // Failsafe cleanup
            generatedHtml = generatedHtml.replace("```html", "").replace("```", "").trim();

            // 3. Fetch user to associate ownership
            User user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // 4. Save to database immediately so it appears in the wizard dropdown
            Template template = new Template();
            template.setName("✨ AI Generated: " + campaignName);
            template.setHtmlContent(generatedHtml);
            template.setUser(user);
            template = templateRepository.save(template);

            // 5. Return the full saved object
            return ResponseEntity.ok(template);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
````

## Frontend AI Calls

Extracted call patterns from `frontend/src/app/templates/page.js`, `frontend/src/app/segments/page.js`, and `frontend/src/app/media/page.js`.

### Generate Template

```js
await fetch("http://localhost:8080/api/ai/generate-template", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-User-Email": session.user.email
  },
  body: JSON.stringify({ topic: aiTopic, provider: aiTemplateProvider })
});
```

### Refine Template

```js
await fetch("http://localhost:8080/api/ai/refine-template", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-User-Email": session.user.email
  },
  body: JSON.stringify({
    currentHtml: formData.htmlContent,
    instructions: refineInstruction,
    provider: aiTemplateProvider
  })
});
```

### Suggest Segments

```js
await fetch(`http://localhost:8080/api/ai/suggest-segments?provider=${aiProvider}`, {
  headers: { "X-User-Email": session.user.email }
});
```

### Generate Image

```js
await fetch("http://localhost:8080/api/ai/generate-image", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-User-Email": session.user.email
  },
  body: JSON.stringify({ prompt: aiPrompt, provider: aiProvider })
});
```

## Fresh Project Copy Checklist

Copy or recreate these backend files:

```txt
com/example/backend/security/SecurityConfig.java
com/example/backend/security/EncryptionUtil.java
com/example/backend/entity/User.java
com/example/backend/entity/Vault.java
com/example/backend/repository/UserRepository.java
com/example/backend/repository/VaultRepository.java
com/example/backend/service/UserService.java
com/example/backend/service/VaultService.java
com/example/backend/controller/UserController.java
com/example/backend/controller/VaultController.java
com/example/backend/service/AiTemplateService.java
com/example/backend/service/AiSegmentService.java
com/example/backend/service/AiImageService.java
com/example/backend/controller/AiController.java
```

Also copy the domain dependencies used by the AI services:

```txt
AiSegmentService needs SubscriberService, Subscriber, Segment, SegmentRepository.
AiImageService needs MediaService, Media, MediaRepository, and uploads static resource config.
AiController wizard endpoint needs Template, TemplateRepository.
```

Copy or recreate these frontend files/patterns:

```txt
src/app/api/auth/[...nextauth]/route.js
src/components/Providers.js
src/components/AppShell.js
Root layout wrapping <Providers><AppShell>...</AppShell></Providers>
fetch(..., { headers: { "X-User-Email": session.user.email } })
```
