-- Tabla usuarios (se puede borrar, pero los pedidos vinculados quedarán sin Ts asociado)
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(256) NOT NULL,
    password VARCHAR(256) NOT NULL,
    email VARCHAR(256) UNIQUE NOT NULL,
    rol ENUM('Direccion', 'Almacen', 'Ts', 'Coordinadora') DEFAULT 'Almacen',
    verificado BOOLEAN DEFAULT FALSE,
    resetPasswordToken VARCHAR(256) NULL,
    resetPasswordExpires DATETIME NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla municipios
CREATE TABLE municipios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla rutas (se puede borrar, las comunidades/pedidos quedarán sin ruta)
CREATE TABLE rutas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla comunidades (se puede borrar, y se eliminarán de pedidoComunidad)
CREATE TABLE comunidades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(200) NOT NULL,
    idMunicipio INT NOT NULL,
    jefa VARCHAR(100),
    contacto VARCHAR(50),
    direccion TEXT,
    idRuta INT NULL, -- Permite NULL al borrar la ruta
    costoPaquete DECIMAL(10, 2) DEFAULT 170.00,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (idRuta) REFERENCES rutas(id) ON DELETE SET NULL,
    FOREIGN KEY (idMunicipio) REFERENCES municipios(id),
    INDEX idx_comunidades_ruta (idRuta),
    INDEX idx_comunidades_municipio (idMunicipio)
);

-- Tabla pedidos (se puede borrar, y se eliminarán sus relaciones en pedidoComunidad)
CREATE TABLE pedidos (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    idTs INT NULL, -- Permite NULL al borrar el usuario Ts
    idRuta INT NULL, -- Permite NULL al borrar la ruta
    fechaEntrega DATE NOT NULL,
    estado ENUM('pendiente', 'finalizado') DEFAULT 'pendiente',
    devoluciones INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (idTs) REFERENCES usuarios(id) ON DELETE SET NULL, -- Borra usuario → pedido queda sin Ts
    FOREIGN KEY (idRuta) REFERENCES rutas(id) ON DELETE SET NULL, -- Borra ruta → pedido queda sin ruta
    INDEX idx_pedidos_idTs (idTs),
    INDEX idx_pedidos_fecha (fechaEntrega),
    INDEX idx_pedidos_ruta (idRuta)
);

-- Tabla pedidoComunidad (se borra automáticamente al eliminar pedido/comunidad)
CREATE TABLE pedidoComunidad (
    idPedido BIGINT,
    idComunidad INT,
    despensasCosto INT,
    despensasMedioCosto INT,
    despensasSinCosto INT,
    despensasApadrinadas INT,
    arpilladas BOOLEAN,
    observaciones TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (idPedido, idComunidad),
    FOREIGN KEY (idPedido) REFERENCES pedidos(id) ON DELETE CASCADE, -- Borrar pedido → elimina esta fila
    FOREIGN KEY (idComunidad) REFERENCES comunidades(id) ON DELETE CASCADE, -- Borrar comunidad → elimina esta fila
    INDEX idx_pc_comunidad (idComunidad) -- Para búsquedas por comunidad
);