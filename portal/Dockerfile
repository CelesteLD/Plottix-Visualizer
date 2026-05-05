FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps && \
    npm install ajv@^8.11.0 --legacy-peer-deps
COPY . .
ARG REACT_APP_SERVICEX_URL=http://localhost:5001
ARG REACT_APP_PLOTTIX_URL=http://localhost:5002
ENV REACT_APP_SERVICEX_URL=$REACT_APP_SERVICEX_URL
ENV REACT_APP_PLOTTIX_URL=$REACT_APP_PLOTTIX_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80