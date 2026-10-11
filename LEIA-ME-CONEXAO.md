# IT Digital — conexão com Supabase

Preparado para o projeto pebcdwbzdbnmzwxqricd. Execute primeiro os dois códigos de perfis e armazenamento já fornecidos na conversa. Este pacote não os executa automaticamente.

## Publicar o site
1. Extraia o ZIP.
2. No repositório https://github.com/methodflowllba-bit/IT-Digital, use Add file → Upload files.
3. Envie index.html, style.css, app.js e supabase-app.js da pasta extraída, substituindo os arquivos existentes. Mantenha assets e logo.png.
4. Clique em Commit changes e aguarde o GitHub Pages atualizar.
5. Abra https://methodflowllba-bit.github.io/IT-Digital/ e entre com seu e-mail e senha.
6. Configurações → Enviar desenho, vídeo ou IT. Escolha título, setor, operação, tipo e arquivo. PDFs/imagens: desenho ou IT. MP4/WebM: vídeo.

## Novos funcionários
1. No SQL Editor do Supabase, execute o conteúdo de 03-novos-usuarios.sql.
2. Crie o funcionário em Authentication → Users → Add user. Escolha senha e confirme o e-mail na criação.
3. Entre no IT Digital como administrador: Configurações → Liberar ou bloquear usuários → Liberar.
4. O funcionário entra com seu próprio e-mail e senha e visualiza os documentos pelo setor/operação ou Buscar.

## Criar funcionários pelo próprio site
Esta opção exige implantar a função que acompanha o pacote. Sem a função, use o procedimento acima.
1. Supabase → Edge Functions → Deploy a new function → Via Editor.
2. Nome: itdigital-users.
3. Substitua o conteúdo do editor pelo arquivo supabase/functions/itdigital-users/index.ts.
4. Implante a função. Se o projeto usar assinatura JWT incompatível com a verificação antiga do gateway, desative Verify JWT para esta função: o código verifica o token diretamente com Auth e exige perfil de administrador ativo antes de criar usuários.
5. As variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são disponibilizadas pelo Supabase no servidor. Não copie a chave service_role para o site ou GitHub.
6. Configurações → Criar acesso de funcionário. Use senha inicial com pelo menos 12 caracteres e comunique os dados ao funcionário por um canal adequado. Não há envio automático de convite por e-mail.

## Permissões e limites
- Perfil administrador ativo: upload, alteração do título, exclusão e liberação/bloqueio de usuários.
- Perfil usuário ativo: visualizar. Sem acesso a funções de edição.
- Perfil bloqueado ou visitante: sem acesso aos documentos.
- Bucket brasformer privado. Links para visualização expiram após cinco minutos; um link já emitido pode continuar funcionando até expirar após bloqueio.
- O sistema não mostra botões de download próprios. PDF/navegador e ferramentas externas ainda permitem copiar conteúdos exibidos; não existe garantia de impedir downloads ou capturas.
- Limite da interface: 50 MB por arquivo. Restrições menores configuradas no bucket/projeto continuam valendo. Vídeos grandes precisam ser comprimidos ou de outra configuração/plano.
- A função cria usuários comuns. Novos administradores podem ser designados no banco pelo administrador do projeto.
- Minhas ITs, Produtos e QR Code continuam como telas iniciais ainda sem cadastro específico.

## Verificar após publicar
- Entre como administrador e envie um PDF e um vídeo pequenos em Baixa Tensão/Bobinagem secundária.
- Abra os arquivos pelo botão da operação.
- Crie/libere um funcionário: confira que visualiza mas não possui upload ou edição.
- Bloqueie o funcionário e tente entrar novamente: o acesso deve ser negado.
- Sem login, o catálogo e os arquivos privados não devem estar acessíveis.

Validação realizada no pacote: sintaxe JavaScript e cenários de interface com conexão simulada. A conexão real, o upload e a função precisam ser validados após a publicação; nenhuma senha de usuário foi recebida.
