-- A NEWEST showcase reads the shop's products on the shelf, most recently created first. The
-- catalogue's other orders already had theirs; this one had none, and a landing page asks for it on
-- every visit.
CREATE INDEX "products_storeId_status_createdAt_idx" ON "products"("storeId", "status", "createdAt");
