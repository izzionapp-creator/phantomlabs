# ================================
# Base image for common dependencies
# ================================
FROM node:24-alpine AS common-deps

WORKDIR /app

# Enable corepack for Yarn Berry
RUN corepack enable

# Copy only the necessary files for dependency resolution
COPY ./package.json ./yarn.lock ./.yarnrc.yml ./tsconfig.base.json ./nx.json /app/
COPY ./.yarn/releases /app/.yarn/releases
COPY ./.yarn/patches /app/.yarn/patches

COPY ./packages/twenty-emails/package.json /app/packages/twenty-emails/
COPY ./packages/twenty-server/package.json /app/packages/twenty-server/
COPY ./packages/twenty-server/patches /app/packages/twenty-server/patches
COPY ./packages/twenty-ui/package.json /app/packages/twenty-ui/
COPY ./packages/twenty-shared/package.json /app/packages/twenty-shared/
COPY ./packages/twenty-front/package.json /app/packages/twenty-front/
COPY ./packages/twenty-sdk/package.json /app/packages/twenty-sdk/

# Install all dependencies (monorepo)
RUN yarn \
 && yarn cache clean \
 && npx nx reset


# ================================
# Build the backend (twenty-server)
# ================================
FROM common-deps AS twenty-server-build

# Copy source code after dependencies to leverage cache
COPY ./packages/twenty-emails /app/packages/twenty-emails
COPY ./packages/twenty-shared /app/packages/twenty-shared
COPY ./packages/twenty-server /app/packages/twenty-server

# Build backend
RUN npx nx run twenty-server:build

# Keep only production deps for runtime
RUN yarn workspaces focus --production twenty-emails twenty-shared twenty-server


# ================================
# Build the frontend (twenty-front)
# ================================
FROM common-deps AS twenty-front-build

ARG REACT_APP_SERVER_BASE_URL

COPY ./packages/twenty-front /app/packages/twenty-front
COPY ./packages/twenty-ui /app/packages/twenty-ui
COPY ./packages/twenty-shared /app/packages/twenty-shared
COPY ./packages/twenty-sdk /app/packages/twenty-sdk

RUN npx nx build twenty-front


# ================================
# Final runtime image
# ================================
FROM node:24-alpine AS twenty

# System dependencies
RUN apk add --no-cache curl jq postgresql-client

# Runtime tools
RUN npm install -g tsx

# Entrypoint
COPY ./packages/twenty-docker/twenty/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

WORKDIR /app/packages/twenty-server

ARG REACT_APP_SERVER_BASE_URL
ENV REACT_APP_SERVER_BASE_URL=$REACT_APP_SERVER_BASE_URL

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION

# Copy built artifacts
COPY --chown=1000 --from=twenty-server-build /app /app
COPY --chown=1000 --from=twenty-front-build /app/packages/twenty-front/build /app/packages/twenty-server/dist/front

# Image metadata
LABEL org.opencontainers.image.source=https://github.com/twentyhq/twenty
LABEL org.opencontainers.image.description="Backend + Frontend image for Twenty, built from monorepo using Nx and Yarn workspaces."

# Prepare storage and permissions
RUN mkdir -p /app/.local-storage /app/packages/twenty-server/.local-storage \
 && chown -R 1000:1000 /app

# Run as non-root user
USER 1000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/main"]