function renderConfirmation() {
  const box = document.getElementById('confirmation-box');
  const dataStr = localStorage.getItem('doce-encanto-last-order');
  if (!dataStr) {
    box.innerHTML = '<p>Não encontramos os dados do pedido. <a href="/">Voltar à loja</a></p>';
    return;
  }

  const data = JSON.parse(dataStr);
  const sim = data.paymentSimulation || {};

  let paymentHtml = '';
  if (sim.type === 'pix') {
    paymentHtml = `
      <h3>Pagamento via Pix (simulado)</h3>
      <div class="qr-fake"></div>
      <p>Escaneie o QR code fictício acima ou copie o código:</p>
      <div class="code-box">${sim.fakeCode}</div>
      <div class="fake-note">${sim.note}</div>
    `;
  } else if (sim.type === 'boleto') {
    paymentHtml = `
      <h3>Boleto (simulado)</h3>
      <p>Código de barras fictício:</p>
      <div class="code-box">${sim.fakeBarcode}</div>
      <p>Vencimento (fictício): <strong>${sim.dueDate}</strong></p>
      <div class="fake-note">${sim.note}</div>
    `;
  } else if (sim.type === 'cartao') {
    paymentHtml = `
      <h3>Pagamento no cartão (simulado)</h3>
      <p>Cartão utilizado: <strong>${sim.cardUsed}</strong></p>
      <p>Código de autorização fictício: <strong>${sim.authCode}</strong></p>
      <div class="fake-note">${sim.note}</div>
    `;
  }

  box.innerHTML = `
    <h2>🎉 Pedido confirmado!</h2>
    <p>Número do pedido: <strong>#${data.orderId}</strong></p>
    <p>Total: <strong>${formatBRL(data.totalCents)}</strong></p>
    <p>Status: <strong>${data.status}</strong></p>
    ${paymentHtml}
    <button class="btn-primary" onclick="window.location.href='/'" style="margin-top:20px;">Voltar à loja</button>
  `;
}

document.addEventListener('DOMContentLoaded', renderConfirmation);
