-- Seed Clients (Letting the database generate IDs automatically to avoid pkey conflicts)
INSERT INTO clients (name, phone, status, case_description, deadline, created_at, updated_at) VALUES
('Александр Вершинин', '+79119998877', 'NEW', 'Оформление пакета документов для покупки коммерческой недвижимости', CURRENT_DATE + INTERVAL '10' DAY, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY),
('Мария Ковалева', '+79228887766', 'IN_PROGRESS', 'Представительство в арбитражном суде по делу о банкротстве ООО "Вектор"', CURRENT_DATE + INTERVAL '5' DAY, NOW() - INTERVAL '5' DAY, NOW() - INTERVAL '2' DAY),
('Дмитрий Соколов', '+79337776655', 'IN_PROGRESS', 'Составление трудовых договоров и соглашений о конфиденциальности (NDA) для IT-стартапа', CURRENT_DATE - INTERVAL '5' DAY, NOW() - INTERVAL '10' DAY, NOW() - INTERVAL '10' DAY),
('Екатерина Морозова', '+79446665544', 'CLOSED', 'Расторжение брака, раздел имущества супругов и определение места жительства детей', CURRENT_DATE - INTERVAL '2' DAY, NOW() - INTERVAL '20' DAY, NOW() - INTERVAL '2' DAY);

-- Seed Client Events (Timeline) using subqueries to get generated client IDs dynamically
INSERT INTO client_events (client_id, event_type, description, created_at)
SELECT id, 'CREATED', 'Клиент создан через форму обратной связи', NOW() - INTERVAL '1' DAY
FROM clients WHERE name = 'Александр Вершинин' LIMIT 1;

INSERT INTO client_events (client_id, event_type, description, created_at)
SELECT id, 'CREATED', 'Клиент создан. Первичный контакт по телефону', NOW() - INTERVAL '5' DAY
FROM clients WHERE name = 'Мария Ковалева' LIMIT 1;

INSERT INTO client_events (client_id, event_type, description, created_at)
SELECT id, 'STATUS_CHANGED', 'Статус изменен с Новый на В работе. Подписан договор об оказании юридических услуг', NOW() - INTERVAL '4' DAY
FROM clients WHERE name = 'Мария Ковалева' LIMIT 1;

INSERT INTO client_events (client_id, event_type, description, created_at)
SELECT id, 'NOTE_ADDED', 'Получена выписка из ЕГРЮЛ и копия устава оппонента для анализа', NOW() - INTERVAL '2' DAY
FROM clients WHERE name = 'Мария Ковалева' LIMIT 1;

INSERT INTO client_events (client_id, event_type, description, created_at)
SELECT id, 'CREATED', 'Клиент создан. Запрос на разработку NDA и трудовых контрактов', NOW() - INTERVAL '10' DAY
FROM clients WHERE name = 'Дмитрий Соколов' LIMIT 1;

INSERT INTO client_events (client_id, event_type, description, created_at)
SELECT id, 'STATUS_CHANGED', 'Статус изменен с Новый на В работе. Начата подготовка шаблонов документов', NOW() - INTERVAL '9' DAY
FROM clients WHERE name = 'Дмитрий Соколов' LIMIT 1;

INSERT INTO client_events (client_id, event_type, description, created_at)
SELECT id, 'CREATED', 'Клиент создан. Развод и раздел совместно нажитого имущества', NOW() - INTERVAL '20' DAY
FROM clients WHERE name = 'Екатерина Морозова' LIMIT 1;

INSERT INTO client_events (client_id, event_type, description, created_at)
SELECT id, 'STATUS_CHANGED', 'Статус изменен с Новый на В работе', NOW() - INTERVAL '19' DAY
FROM clients WHERE name = 'Екатерина Морозова' LIMIT 1;

INSERT INTO client_events (client_id, event_type, description, created_at)
SELECT id, 'NOTE_ADDED', 'Подготовлено и отправлено исковое заявление в районный суд', NOW() - INTERVAL '15' DAY
FROM clients WHERE name = 'Екатерина Морозова' LIMIT 1;

INSERT INTO client_events (client_id, event_type, description, created_at)
SELECT id, 'STATUS_CHANGED', 'Статус изменен с В работе на Закрыт. Судебное решение вступило в силу, документы переданы клиенту', NOW() - INTERVAL '2' DAY
FROM clients WHERE name = 'Екатерина Морозова' LIMIT 1;
