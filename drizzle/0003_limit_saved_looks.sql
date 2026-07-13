CREATE TRIGGER `try_on_looks_limit_before_insert`
BEFORE INSERT ON `try_on_looks`
WHEN (SELECT COUNT(*) FROM `try_on_looks` WHERE `user_id` = NEW.`user_id`) >= 12
BEGIN
	SELECT RAISE(ABORT, 'SAVED_LOOK_LIMIT');
END;
