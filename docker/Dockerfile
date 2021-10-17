# XXX This is overly complicated, I know.

FROM alpine:3.11

RUN apk add --no-cache \
    python3 \
    supervisor

# Home directory of the default user.
WORKDIR /root

COPY src .

RUN pip3 install -r src/requirements.txt
