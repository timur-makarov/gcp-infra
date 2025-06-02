FROM python:3.13-alpine

WORKDIR /app

COPY . .

RUN apk add gcc musl-dev linux-headers

RUN pip install -r requirements.txt

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
