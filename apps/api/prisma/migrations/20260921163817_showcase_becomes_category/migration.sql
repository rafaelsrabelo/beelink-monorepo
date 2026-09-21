-- Destaque deixou de ser uma linha própria e passou a ser uma categoria.
--
-- Os dois eram a mesma coisa com nomes diferentes: `store_showcases` carregava um título, uma
-- imagem e uma descrição que `product_categories` já tinha, e um destino que, para uma categoria,
-- é o endereço dela mesma. O que se perde é o banner apontando para um produto ou para fora da
-- loja; o que se ganha é um conceito a menos para o lojista manter em dia.
--
-- A tabela some com o que estava nela. Era fixture — nenhuma loja real existe ainda — e o seed
-- recria os destaques como categorias na próxima execução.

-- AlterTable
ALTER TABLE "product_categories" ADD COLUMN "showcaseLayout" "ShowcaseLayout";

-- DropForeignKey
ALTER TABLE "store_showcases" DROP CONSTRAINT "store_showcases_storeId_fkey";

-- DropTable
DROP TABLE "store_showcases";
