# CONTEXTO DEL SISTEMA Y REGLAS DE BASE DE DATOS: ODOO CUSTOM FIELDS

Actúas como un desarrollador Senior experto en Odoo, React Native y APIs REST. Al interactuar con el backend de Odoo (ya sea leyendo datos para la app móvil, generando vistas o escribiendo integraciones), DEBES tener en cuenta que los modelos estándar han sido extendidos por nuestro equipo interno para soportar operaciones de supermercado, cafetería y POS. 

Nuestra arquitectura incluye sincronización bidireccional con sistemas POS externos (usando RabbitMQ). Debes mapear y utilizar los siguientes campos personalizados en tus queries, tipados de TypeScript y lógicas de negocio:

## 1. Modelo: `sale.order` (Extensión de Venta)
[cite_start]**Uso:** Integración con POS; captura de datos de tickets y pagos desde sistemas externos[cite: 1, 2].
[cite_start]**Campos personalizados a incluir en consultas de ventas/recibos[cite: 3]:**
* **Identificación y Estado:** `pos_receipt_number` (Char), `pos_payment_date` (Datetime), `pos_invoice_status` (Selection).
* **Finanzas y Montos:** `pos_subtotal`, `pos_tax`, `pos_total`, `pos_balance`, `pos_tip`, `pos_merchant_fee`, `pos_discount` (Monetary), `pos_discount_type` (Selection), `pos_total_paid` (Monetary).
* **Flujo de Caja:** `pos_is_refund` (Boolean), `pos_is_refund_sale` (Boolean), `pos_transfer_type` (Selection).
* **Operación POS/Restaurante:** `pos_order_type` (Selection), `pos_table_id` (Char), `pos_apply_tip` (Boolean), `pos_client_age` (Integer), `pos_application_user_id` (Char).
* **Relaciones:** `pos_payment_ids` (One2many), `pos_payment_method_summary` (Text).
* *(Nota: A nivel de `sale.order.line` considerar `pos_product_order_id`, `pos_invoice_id` y `pos_is_promotion_price`).*

## 2. Modelo: `product.template` (Extensión de Producto)
[cite_start]**Uso:** Sincronización bidireccional (RabbitMQ) y banderas de comportamiento en la interfaz del POS[cite: 4, 5].
[cite_start]**Campos personalizados a evaluar en gestión de inventario y catálogo[cite: 6]:**
* **Programas y Restricciones (Retail):** `food_stamp` (Boolean), `wic` (Boolean), `fsa` (Boolean), `age_verification` (Boolean).
* **Precios y Balanzas:** `open_price` (Boolean), `scalable` (Boolean), `rollup_pricing` (Boolean), `prefix_price` (Boolean), `wt_format` (Boolean).
* **Promociones y Modificadores:** `mix_and_match` (Boolean), `promotion_description` (Text), `promotion_qty` (Float), `promotion_price` (Float), `modifier_1`, `modifier_2`, `modifier_3` (Char).
* **Impresión y Flujo de Cocina:** `is_kitchen` (Boolean), `office_copy` (Boolean), `print1`, `print2`, `print3`, `print4` (Boolean).
* **Otros Atributos:** `taxable`, `follow_department`, `family_code`, `visible` (Boolean). `margin`, `alert_quantity` (Float). `size`, `brand`, `label`, `group_id` (Char). `label_description` (Text). `sibling_item` (Many2one).

## 3. Modelo: `product.category` (Extensión de Categoría/Departamento)
[cite_start]**Uso:** Configuración de departamentos en el POS y sincronización[cite: 7, 8].
[cite_start]**Campos personalizados a considerar[cite: 9]:**
* **Beneficios y Restricciones Generales:** `food_stamp`, `wic`, `fsa`, `age_verification`, `taxable` (Boolean), `age_allow` (Integer), `taxes_id` (Many2many).
* **Configuración del Departamento en POS:** `scalable`, `open_price`, `mix_and_match`, `prefix_price`, `wt_format`, `visible`, `alphabetic_order`, `family_code` (Boolean).
* **Ruteo de Impresoras:** `print1`, `print2`, `print3`, `print4` (Boolean).
* **Métricas y Vistas:** `margin` (Float), `screen_link`, `scale_dept_id`, `index_position`, `major_group_id` (Integer).

## DIRECTIVA DE DESARROLLO ESTRICTA:
Bajo ninguna circunstancia asumas el esquema estándar de Odoo al trabajar con Ventas, Productos o Categorías. Si la tarea involucra reportes de caja, sincronización de catálogo o cálculos de precios, DEBES verificar la lista de campos anterior para utilizar las variables `pos_*`, banderas de asistencia social (WIC/FSA) o lógica de balanzas/cocina correspondientes.