FROM maven:3.9.16-eclipse-temurin-17-alpine AS build

WORKDIR /workspace
COPY pom.xml ./
RUN mvn -B -q -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -B -q -DskipTests package && \
    cp "$(find target -maxdepth 1 -type f -name '*.jar' ! -name '*.original' | head -n 1)" /workspace/application.jar

FROM eclipse-temurin:17-jre-alpine AS runtime

RUN addgroup -S keyrak && adduser -S keyrak -G keyrak && \
    mkdir -p /app/uploads/id-cards /app/uploads/property-media && chown -R keyrak:keyrak /app
WORKDIR /app
COPY --from=build --chown=keyrak:keyrak /workspace/application.jar /app/application.jar

USER keyrak
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["java", "-jar", "/app/application.jar"]
