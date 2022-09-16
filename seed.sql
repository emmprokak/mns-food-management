DROP DATABASE home_storage1;
CREATE DATABASE home_storage1;
USE home_storage1;

CREATE TABLE users(
    id VARCHAR(255) NOT NULL,
    username VARCHAR(69) NOT NULL,
    password VARCHAR(255) NOT NULL,
    theme VARCHAR(35) DEFAULT 'rgb(49, 108, 244)',
    PRIMARY KEY (id)
);

CREATE TABLE products(
    name VARCHAR(200) NOT NULL,
    quantity INT DEFAULT 0,
    image VARCHAR(255) DEFAULT 'empty.jpg',
    created TIMESTAMP DEFAULT now(), 
    updated TIMESTAMP DEFAULT now() ON UPDATE now(),
    createdBy VARCHAR(255) NOT NULL,
    comments TEXT,
    id VARCHAR(200) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (createdBy) REFERENCES users(id)
);


CREATE TABLE tags (
    name VARCHAR(30),
    id INT AUTO_INCREMENT NOT NULL,
    PRIMARY KEY (id)
);

INSERT INTO tags(name) VALUES
    ('essential'), ('vegetables'), ('fruit'), ('meat'), ('dairy'),
    ('frozen'), ('fresh'), ('luxury'), ('nuts'), ('candy'), ('healthy');

CREATE TABLE product_tags(
    id VARCHAR(200) NOT NULL,
    product_id VARCHAR(200) NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id)
);


CREATE TABLE product_packages(
    product_id VARCHAR(200) NOT NULL,
    id INT AUTO_INCREMENT NOT NULL,
    created TIMESTAMP DEFAULT now(), 
    expiration DATE,
    PRIMARY KEY(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);







