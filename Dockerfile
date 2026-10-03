# Stage 1: build the static pages from source (standard library Python only, no packages).
FROM python:3.12-alpine AS build
WORKDIR /src
COPY site-src ./site-src
RUN python site-src/build.py

# Stage 2: serve the built site. Only site/ is copied in: no source, docs, tests or dotfiles.
# The health check (GET /healthz) is configured in Coolify, not here: Coolify then waits for the new
# container to be healthy before it retires the old one, so a deploy has no gap.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/site /usr/share/nginx/html
RUN nginx -t
EXPOSE 80
