CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(256) NOT NULL,
    password VARCHAR(256) NOT NULL,
    email VARCHAR(256) UNIQUE NOT NULL,
    rol ENUM('Direccion', 'Almacen', 'Ts') DEFAULT 'Almacen',
    verificado BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE rutas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE comunidades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre TEXT NOT NULL,
    jefa TEXT,
    contacto TEXT,
    direccion TEXT,
    idRuta INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (idRuta) REFERENCES rutas(id)
);

CREATE TABLE pedidos (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    idTs INT NOT NULL,
    idRuta INT NOT NULL,
    fechaEntrega DATE NOT NULL,
    estado ENUM('pendiente', 'creado', 'finalizado') DEFAULT 'pendiente',
    observaciones TEXT,
    devoluciones INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (idTs) REFERENCES usuarios(id),
    FOREIGN KEY (idRuta) REFERENCES rutas(id)
);

CREATE TABLE pedidoComunidad (
    idPedido BIGINT,
    idComunidad INT,
    despensasCosto INT,
    despensasMedioCosto INT,
    despensasSinCosto INT,
    despensasApadrinadas INT,
    arpilladas BOOLEAN,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (idPedido, idComunidad),
    FOREIGN KEY (idPedido) REFERENCES pedidos(id),
    FOREIGN KEY (idComunidad) REFERENCES comunidades(id)
);
