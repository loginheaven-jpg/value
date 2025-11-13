CREATE TABLE `values_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`value1` varchar(100) NOT NULL,
	`value2` varchar(100) NOT NULL,
	`value3` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `values_assessments_id` PRIMARY KEY(`id`)
);
