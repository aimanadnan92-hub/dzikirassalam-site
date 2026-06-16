FROM nginx:alpine

# Serve the single-page static site
COPY index.html /usr/share/nginx/html/index.html

EXPOSE 80
