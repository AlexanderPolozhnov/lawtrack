-- Seed Clients
INSERT INTO clients (id, name, phone, status, case_description, deadline, created_at, updated_at) VALUES
(1, 'Александр Вершинин', '+79119998877', 'NEW', 'Оформление пакета документов для покупки коммерческой недвижимости', CURRENT_DATE + INTERVAL '10' DAY, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY),
(2, 'Мария Ковалева', '+79228887766', 'IN_PROGRESS', 'Представительство в арбитражном суде по делу о банкротстве ООО "Вектор"', CURRENT_DATE + INTERVAL '5' DAY, NOW() - INTERVAL '5' DAY, NOW() - INTERVAL '2' DAY),
(3, 'Дмитрий Соколов', '+79337776655', 'IN_PROGRESS', 'Составление трудовых договоров и соглашений о конфиденциальности (NDA) для IT-стартапа', CURRENT_DATE - INTERVAL '5' DAY, NOW() - INTERVAL '10' DAY, NOW() - INTERVAL '10' DAY),
(4, 'Екатерина Морозова', '+79446665544', 'CLOSED', 'Расторжение брака, раздел имущества супругов и определение места жительства детей', CURRENT_DATE - INTERVAL '2' DAY, NOW() - INTERVAL '20' DAY, NOW() - INTERVAL '2' DAY);

-- Reset identity sequence for clients table so that new clients get id 5+
ALTER TABLE clients ALTER COLUMN id RESTART WITH 5;

-- Seed Client Events (Timeline)
INSERT INTO client_events (client_id, event_type, description, created_at) VALUES
-- Client 1
(1, 'CREATED', 'Клиент создан через форму обратной связи', NOW() - INTERVAL '1' DAY),
-- Client 2
(2, 'CREATED', 'Клиент создан. Первичный контакт по телефону', NOW() - INTERVAL '5' DAY),
(2, 'STATUS_CHANGED', 'Статус изменен с Новый на В работе. Подписан договор об оказании юридических услуг', NOW() - INTERVAL '4' DAY),
(2, 'NOTE_ADDED', 'Получена выписка из ЕГРЮЛ и копия устава оппонента для анализа', NOW() - INTERVAL '2' DAY),
-- Client 3
(3, 'CREATED', 'Клиент создан. Запрос на разработку NDA и трудовых контрактов', NOW() - INTERVAL '10' DAY),
(3, 'STATUS_CHANGED', 'Статус изменен с Новый на В работе. Начата подготовка шаблонов документов', NOW() - INTERVAL '9' DAY),
-- Client 4
(4, 'CREATED', 'Клиент создан. Развод и раздел совместно нажитого имущества', NOW() - INTERVAL '20' DAY),
(4, 'STATUS_CHANGED', 'Статус изменен с Новый на В работе', NOW() - INTERVAL '19' DAY),
(4, 'NOTE_ADDED', 'Подготовлено и отправлено исковое заявление в районный суд', NOW() - INTERVAL '15' DAY),
(4, 'STATUS_CHANGED', 'Статус изменен с В работе на Закрыт. Судебное решение вступило в силу, документы переданы клиенту', NOW() - INTERVAL '2' DAY);
