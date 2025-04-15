FROM scratch
COPY dist/mississippi-burn-bans-api /app/mississippi-burn-bans-api
ENTRYPOINT [ "/app/mississippi-burn-bans-api" ]
