FROM python:3.13-alpine

WORKDIR /app

RUN apk add gcc musl-dev linux-headers

COPY requirements.txt .

RUN pip install -r requirements.txt

COPY . .

CMD ["python", "main.py"]
