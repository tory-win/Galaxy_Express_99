\set ON_ERROR_STOP on

begin;
delete from freight_requests where id = 'R-DEMO-VIDEO';
commit;
