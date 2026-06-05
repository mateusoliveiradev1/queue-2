-- QUEUE/2 Phase 4 active play reorder support.
-- Owner module: play. Allows member-scoped replacement of the active layout
-- inside a transaction so immediate unique indexes cannot observe transient
-- duplicate Principal or position states.

ALTER TABLE app.play_active_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.play_active_games FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_play_active_games_delete_members ON app.play_active_games;
CREATE POLICY app_play_active_games_delete_members ON app.play_active_games
  FOR DELETE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));

GRANT DELETE ON app.play_active_games TO queue2_app_runtime, queue2_worker;
