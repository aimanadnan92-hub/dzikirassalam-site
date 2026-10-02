FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html
RUN rm -rf /usr/share/nginx/html/*.md /usr/share/nginx/html/Dockerfile /usr/share/nginx/html/nginx.conf /usr/share/nginx/html/assets/img/*.json /usr/share/nginx/html/.git /usr/share/nginx/html/.gitignore /usr/share/nginx/html/assets/.playwright-cli
EXPOSE 80
