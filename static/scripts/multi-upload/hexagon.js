function iniciarAnimacaoBola() {
    const canvas = document.getElementById('canvas-loading');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      hexagon.x = canvas.width / 2;
      hexagon.y = canvas.height / 2;
    });
    
    // Configurações do hexágono
    const hexagon = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      radius: Math.min(canvas.width, canvas.height) / 4,
      sides: 6,
      angle: 0,
      angularSpeed: 0.01 // rotação (radianos por frame)
    };
    
    // Configurações da bola
    const ball = {
      x: canvas.width / 2,  // centraliza no eixo X
      y: canvas.height / 2, // centraliza no eixo Y
      radius: 15,
      vx: -4,               // se quiser que comece parada
      vy: 0,
      color: '#f00'
    };
    
    // Parâmetros físicos
    const gravity = 0.033;;       // aceleração gravitacional
    const bounceFactor = 0.8;  // fator de restituição na colisão
    const airFriction = 0.998; // resistência do ar por frame
    
    // Controle de interação com o mouse
    let dragging = false;
    let lastMouseX = 0, lastMouseY = 0;
    
    // Evento de início do arrasto
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const dist = Math.hypot(mouseX - ball.x, mouseY - ball.y);
      if (dist < ball.radius) {
        dragging = true;
        lastMouseX = mouseX;
        lastMouseY = mouseY;
      }
    });
    
    // Evento de movimento do mouse
    canvas.addEventListener('mousemove', (e) => {
      if (dragging) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        // Calcula a "região segura": o hexágono inset (interior) para manter a bola dentro
        const hexVerts = getHexagonVertices(hexagon);
        const inset = getInsetPolygon(hexVerts, ball.radius);
        // Se o ponto do mouse não estiver dentro do inset, ele é "limitado" à borda mais próxima
        const clamped = clampPointToPolygon(mouseX, mouseY, inset);
        // Atualiza a velocidade com base na movimentação
        ball.vx = clamped.x - lastMouseX;
        ball.vy = clamped.y - lastMouseY;
        ball.x = clamped.x;
        ball.y = clamped.y;
        lastMouseX = clamped.x;
        lastMouseY = clamped.y;
      }
    });
    
    canvas.addEventListener('mouseup', () => { dragging = false; });
    canvas.addEventListener('mouseleave', () => { dragging = false; });
    
    // Retorna os vértices do hexágono considerando sua rotação atual
    function getHexagonVertices(hex) {
      const vertices = [];
      for (let i = 0; i < hex.sides; i++) {
        const theta = (Math.PI * 2 / hex.sides) * i + hex.angle;
        const x = hex.x + hex.radius * Math.cos(theta);
        const y = hex.y + hex.radius * Math.sin(theta);
        vertices.push({ x, y });
      }
      return vertices;
    }
    
    // Desenha o contorno do hexágono
    function drawHexagon(vertices) {
      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      ctx.closePath();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    // Dado um polígono convexo, retorna um polígono "inset" deslocado para dentro pelo valor 'offset'
    function getInsetPolygon(vertices, offset) {
      const inset = [];
      for (let i = 0; i < vertices.length; i++) {
        const prev = vertices[(i - 1 + vertices.length) % vertices.length];
        const curr = vertices[i];
        const next = vertices[(i + 1) % vertices.length];
        
        // Calcula a normal para a aresta anterior (prev -> curr)
        let dx1 = curr.x - prev.x;
        let dy1 = curr.y - prev.y;
        let len1 = Math.hypot(dx1, dy1);
        let n1x = -dy1 / len1;
        let n1y = dx1 / len1;
        // Garante que a normal aponte para o interior (usando o centro do hexágono)
        let toCenter1X = hexagon.x - curr.x;
        let toCenter1Y = hexagon.y - curr.y;
        if (n1x * toCenter1X + n1y * toCenter1Y < 0) {
          n1x = -n1x; n1y = -n1y;
        }
    
        // Calcula a normal para a aresta seguinte (curr -> next)
        let dx2 = next.x - curr.x;
        let dy2 = next.y - curr.y;
        let len2 = Math.hypot(dx2, dy2);
        let n2x = -dy2 / len2;
        let n2y = dx2 / len2;
        let toCenter2X = hexagon.x - curr.x;
        let toCenter2Y = hexagon.y - curr.y;
        if (n2x * toCenter2X + n2y * toCenter2Y < 0) {
          n2x = -n2x; n2y = -n2y;
        }
    
        // Média das normais para deslocar o vértice para dentro
        let avgNx = (n1x + n2x) / 2;
        let avgNy = (n1y + n2y) / 2;
        let mag = Math.hypot(avgNx, avgNy);
        if (mag === 0) { avgNx = n1x; avgNy = n1y; mag = Math.hypot(avgNx, avgNy); }
        avgNx /= mag;
        avgNy /= mag;
        inset.push({ x: curr.x + avgNx * offset, y: curr.y + avgNy * offset });
      }
      return inset;
    }
    
    // Verifica se um ponto está dentro de um polígono convexo
    function pointInPolygon(point, vertices) {
      let inside = true;
      for (let i = 0; i < vertices.length; i++) {
        const p1 = vertices[i];
        const p2 = vertices[(i + 1) % vertices.length];
        // Para um polígono em ordem CCW, o ponto está dentro se o produto vetorial for sempre positivo.
        if (((p2.x - p1.x) * (point.y - p1.y) - (p2.y - p1.y) * (point.x - p1.x)) < 0) {
          inside = false;
          break;
        }
      }
      return inside;
    }
    
    // Se o ponto (x,y) não estiver dentro do polígono, retorna o ponto mais próximo na borda
    function clampPointToPolygon(x, y, polygon) {
      if (pointInPolygon({ x, y }, polygon)) {
        return { x, y };
      }
      let closestPoint = null;
      let minDist = Infinity;
      for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len2 = dx * dx + dy * dy;
        let t = ((x - p1.x) * dx + (y - p1.y) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const projX = p1.x + t * dx;
        const projY = p1.y + t * dy;
        const dist = Math.hypot(x - projX, y - projY);
        if (dist < minDist) {
          minDist = dist;
          closestPoint = { x: projX, y: projY };
        }
      }
      return closestPoint;
    }
    
    // Projeta o ponto (px,py) na reta definida por (x1,y1) e (x2,y2)
    function projectPointOnLine(px, py, x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len2 = dx * dx + dy * dy;
      const t = ((px - x1) * dx + (py - y1) * dy) / len2;
      const tClamped = Math.max(0, Math.min(1, t));
      return {
        x: x1 + tClamped * dx,
        y: y1 + tClamped * dy,
        t: tClamped
      };
    }
    
    // Reflete a velocidade (vx,vy) usando a normal (nx,ny)
    function reflect(vx, vy, nx, ny) {
      const dot = vx * nx + vy * ny;
      return {
        vx: vx - 2 * dot * nx,
        vy: vy - 2 * dot * ny
      };
    }
    
    function update() {
      // Atualiza a rotação do hexágono
      hexagon.angle += hexagon.angularSpeed;
    
      if (!dragging) {
        ball.vy += gravity;
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vx *= airFriction;
        ball.vy *= airFriction;
      }
    
      // Obtém os vértices do hexágono (usados tanto para colisão quanto para definir a região segura)
      const vertices = getHexagonVertices(hexagon);
    
      // Colisões somente se a bola estiver dentro do hexágono
      if (!dragging && pointInPolygon({ x: ball.x, y: ball.y }, vertices)) {
        for (let i = 0; i < vertices.length; i++) {
          const p1 = vertices[i];
          const p2 = vertices[(i + 1) % vertices.length];
    
          const edgeDx = p2.x - p1.x;
          const edgeDy = p2.y - p1.y;
          const len = Math.hypot(edgeDx, edgeDy);
    
          let normalX = -edgeDy / len;
          let normalY = edgeDx / len;
          // Garante que a normal aponte para o interior do hexágono
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          const toCenterX = hexagon.x - midX;
          const toCenterY = hexagon.y - midY;
          if ((normalX * toCenterX + normalY * toCenterY) < 0) {
            normalX = -normalX;
            normalY = -normalY;
          }
    
          const proj = projectPointOnLine(ball.x, ball.y, p1.x, p1.y, p2.x, p2.y);
          const dx = ball.x - proj.x;
          const dy = ball.y - proj.y;
          const dist = Math.hypot(dx, dy);
    
          if (dist < ball.radius) {
            // Velocidade local da parede (devido à rotação)
            const rx = proj.x - hexagon.x;
            const ry = proj.y - hexagon.y;
            const wallVx = -hexagon.angularSpeed * ry;
            const wallVy = hexagon.angularSpeed * rx;
    
            const relVx = ball.vx - wallVx;
            const relVy = ball.vy - wallVy;
    
            if (relVx * normalX + relVy * normalY < 0) {
              const reflected = reflect(relVx, relVy, normalX, normalY);
              ball.vx = wallVx + reflected.vx * bounceFactor;
              ball.vy = wallVy + reflected.vy * bounceFactor;
    
              const overlap = ball.radius - dist;
              ball.x += normalX * overlap;
              ball.y += normalY * overlap;
            }
          }
        }
      }

      // Se a bola sair do hexágono ou da tela, reinicialize-a
      if (!pointInPolygon({ x: ball.x, y: ball.y }, vertices) ||
        ball.y - ball.radius > canvas.height ||
        ball.x + ball.radius < 0 ||
        ball.x - ball.radius > canvas.width) {
          // Reinicializa a bola com as condições iniciais ou personalizadas
          ball.x = canvas.width / 2;
          ball.y = 100;
          ball.vx = 4;
          ball.vy = 0;
        }
    }
    
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const vertices = getHexagonVertices(hexagon);
      drawHexagon(vertices);
      // Opcional: desenha o polígono inset (região segura) para visualização
      // const inset = getInsetPolygon(vertices, ball.radius);
      // ctx.beginPath();
      // ctx.moveTo(inset[0].x, inset[0].y);
      // for(let i=1;i<inset.length;i++){
      //   ctx.lineTo(inset[i].x, inset[i].y);
      // }
      // ctx.closePath();
      // ctx.strokeStyle = 'rgba(0,255,0,0.5)';
      // ctx.stroke();
    
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();
    }
    
    function loop() {
      update();
      draw();
      requestAnimationFrame(loop);
    }

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        hexagon.x = canvas.width / 2;
        hexagon.y = canvas.height / 2;
        hexagon.radius = Math.min(canvas.width, canvas.height) / 4; // redimensiona
        
        // Se quiser recolocar a bola no centro ao redimensionar:
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
    });
    
    loop();
}

document.addEventListener('DOMContentLoaded', function () {
    window.addEventListener('load', function() {
        var spinner = document.querySelector('.loading-spinner');
        var canvasLoading = document.getElementById('canvas-loading');
    
        if (animationOption === 'ball') {
        spinner.style.display = 'none';
        canvasLoading.style.display = 'block';
        // Carrega a animação da bola
        if (typeof iniciarAnimacaoBola === 'function') {
            iniciarAnimacaoBola();
        }
        } else {
        canvasLoading.style.display = 'none';
        spinner.style.display = 'block';
        }
    });
});