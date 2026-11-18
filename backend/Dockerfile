# Multi-stage build for the Spring Boot backend (Java 21 / Boot 4.1.2)
FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package \
    && mv target/*.jar /workspace/app.jar

FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app \
    && useradd --system --gid app --no-create-home app \
    && chown app:app /app

USER app

COPY --from=build --chown=app:app /workspace/app.jar /app/app.jar

ENV JAVA_OPTS="" \
    SPRING_PROFILES_ACTIVE=local \
    SERVER_PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -fsS http://127.0.0.1:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
